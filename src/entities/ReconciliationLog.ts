import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum ReconciliationStatus {
  CLEAN   = 'CLEAN',
  FLAGGED = 'FLAGGED',
}

@Entity('reconciliation_logs')
export class ReconciliationLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  merchantId!: string;

  @Column({ type: 'timestamp' })
  ranAt!: Date;

  @Column({ type: 'timestamp' })
  periodFrom!: Date;

  @Column({ type: 'timestamp' })
  periodTo!: Date;

  // ─── Counts ───────────────────────────────────────────────────────────────
  @Column({ type: 'int', default: 0 })
  totalFetchedFromNomba!: number;

  @Column({ type: 'int', default: 0 })
  totalReconciled!: number;

  // In Nomba but not found in our DB
  @Column({ type: 'int', default: 0 })
  totalOrphans!: number;

  // Amount mismatch between our DB and Nomba
  @Column({ type: 'int', default: 0 })
  totalDrift!: number;

  // In our DB as PENDING but not seen in Nomba response
  @Column({ type: 'int', default: 0 })
  totalMissing!: number;

  // ─── Detail arrays for operator review ───────────────────────────────────
  @Column({ type: 'jsonb', nullable: true })
  orphans!: object;

  @Column({ type: 'jsonb', nullable: true })
  drifts!: object;

  @Column({ type: 'jsonb', nullable: true })
  missing!: object;

  @Column({ type: 'enum', enum: ReconciliationStatus })
  status!: ReconciliationStatus;

  @CreateDateColumn()
  createdAt!: Date;
}
