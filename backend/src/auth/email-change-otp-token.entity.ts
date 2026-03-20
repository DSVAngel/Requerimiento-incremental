import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity()
@Index(['userId', 'used', 'expiresAt'])
@Index(['newEmail', 'used'])
export class EmailChangeOtpToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column()
  newEmail!: string;

  @Column({ length: 64 })
  otpHash!: string;

  @Column({ default: false })
  used!: boolean;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
