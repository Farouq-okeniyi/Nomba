import { AppDataSource } from '../../config';
import { OutboundWebhook, OutboundWebhookStatus } from '../../entities/OutboundWebhook';
import { Merchant } from '../../entities/Merchant';
import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../../config';
import { LessThanOrEqual } from 'typeorm';

const outboundRepo = AppDataSource.getRepository(OutboundWebhook);
const merchantRepo = AppDataSource.getRepository(Merchant);

export class OutboundService {
  static async fireWebhook(merchantId: string, eventType: string, payload: any): Promise<void> {
    const merchant = await merchantRepo.findOne({ where: { id: merchantId } });
    if (!merchant || !merchant.webhookUrl) return;

    const webhook = outboundRepo.create({
      merchantId,
      eventType,
      payload,
      status: OutboundWebhookStatus.PENDING,
      attempts: 0,
      nextRetryAt: new Date(),
    });
    
    await outboundRepo.save(webhook);
    
    // Attempt async delivery immediately without awaiting so it doesn't block
    this.deliverWebhook(webhook, merchant).catch(e => logger.error(`Immediate webhook delivery failed: ${e.message}`));
  }

  static async deliverWebhook(webhook: OutboundWebhook, merchant: Merchant): Promise<void> {
    webhook.attempts += 1;
    webhook.lastAttemptAt = new Date();

    try {
      const payloadString = JSON.stringify(webhook.payload);
      const signature = crypto.createHmac('sha256', merchant.webhookSecret).update(payloadString).digest('hex');

      await axios.post(merchant.webhookUrl, webhook.payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Nomba-Signature': signature,
        },
        timeout: 5000,
      });

      webhook.status = OutboundWebhookStatus.DELIVERED;
    } catch (error: any) {
      logger.error(`Webhook delivery failed for ${webhook.id}: ${error.message}`);
      webhook.lastResponseBody = error.message;

      // Exponential backoff: 5s, 30s, 5m, 30m, 2h
      const backoffDelays = [5, 30, 300, 1800, 7200];
      if (webhook.attempts <= backoffDelays.length) {
        webhook.status = OutboundWebhookStatus.FAILED;
        const delaySeconds = backoffDelays[webhook.attempts - 1];
        webhook.nextRetryAt = new Date(Date.now() + delaySeconds * 1000);
      } else {
        webhook.status = OutboundWebhookStatus.FAILED;
      }
    }

    await outboundRepo.save(webhook);
  }

  static async retryPendingWebhooks(): Promise<void> {
    const pending = await outboundRepo.find({
      where: [
        { status: OutboundWebhookStatus.PENDING, nextRetryAt: LessThanOrEqual(new Date()) },
        { status: OutboundWebhookStatus.FAILED, nextRetryAt: LessThanOrEqual(new Date()) }
      ]
    });

    for (const webhook of pending) {
      const merchant = await merchantRepo.findOne({ where: { id: webhook.merchantId } });
      if (merchant) {
        await this.deliverWebhook(webhook, merchant);
      }
    }
  }
}
