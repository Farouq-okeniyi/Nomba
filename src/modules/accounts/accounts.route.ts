import express from 'express';
import { accountsController } from './accounts.controller';
import { validateData } from '../../middlewares';
import { CreateAccountSchema, UpdateAccountSchema } from './accounts.types';

const accountsRoute = express.Router();

/**
 * @openapi
 * /accounts:
 *   post:
 *     tags:
 *       - Virtual Accounts
 *     summary: Provision a new Nomba virtual account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountName
 *               - customerId
 *             properties:
 *               accountName:
 *                 type: string
 *                 example: "John Doe PayEasy Account"
 *               customerId:
 *                 type: string
 *                 example: "CUST-10029"
 *               bvn:
 *                 type: string
 *                 example: "12345678901"
 *     responses:
 *       "201":
 *         description: Account successfully provisioned
 *       "400":
 *         description: Validation failed
 *   get:
 *     tags:
 *       - Virtual Accounts
 *     summary: List all provisioned accounts
 *     responses:
 *       "200":
 *         description: List of accounts
 */
accountsRoute.route('/')
  .post(validateData(CreateAccountSchema), accountsController.createAccount)
  .get(accountsController.listAccounts);

/**
 * @openapi
 * /accounts/{id}:
 *   get:
 *     tags:
 *       - Virtual Accounts
 *     summary: Get virtual account details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: Account details
 *       "404":
 *         description: Account not found
 *   patch:
 *     tags:
 *       - Virtual Accounts
 *     summary: Update virtual account details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accountName:
 *                 type: string
 *                 example: "Updated Name"
 *               kycTier:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       "200":
 *         description: Account updated successfully
 *   delete:
 *     tags:
 *       - Virtual Accounts
 *     summary: Close virtual account
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: Account suspended and closed locally
 */
accountsRoute.route('/:id')
  .get(accountsController.getAccount)
  .patch(validateData(UpdateAccountSchema), accountsController.updateAccount)
  .delete(accountsController.deleteAccount);

/**
 * @openapi
 * /accounts/{id}/suspend:
 *   post:
 *     tags:
 *       - Virtual Accounts
 *     summary: Suspend virtual account
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: Account suspended successfully
 */
accountsRoute.post('/:id/suspend', accountsController.suspendAccount);

/**
 * @openapi
 * /accounts/{id}/reactivate:
 *   post:
 *     tags:
 *       - Virtual Accounts
 *     summary: Reactivate virtual account
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: Account reactivated successfully
 */
accountsRoute.post('/:id/reactivate', accountsController.reactivateAccount);

export { accountsRoute };
