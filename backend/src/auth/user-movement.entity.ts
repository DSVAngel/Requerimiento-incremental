import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity()
@Index(['userId', 'performedAt'])
export class UserMovement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ length: 120 })
  movement!: string;

  @Column({ type: 'text', nullable: true })
  detail!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  performedAt!: Date;
}
