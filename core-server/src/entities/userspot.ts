import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export default class UserSpot {
  constructor(
    userId: string,
    spotId: string,
    imgFileName: string | null,
    visitedAt: Date | null
  ) {
    this.userId = userId;
    this.spotId = spotId;
    this.imgFileName = imgFileName;
    this.visitedAt = visitedAt;
  }
  @PrimaryGeneratedColumn("uuid")
  public id: string | undefined;

  @Column({ type: "varchar" })
  public spotId: string;

  @Column({ type: "varchar" })
  public userId: string;

  @Column({ nullable: true, type: "varchar" })
  public imgFileName: string | null;

  @Column({ nullable: true, type: "timestamp" })
  public visitedAt: Date | null;

  @Column({ type: "boolean" })
  public latest = false;

  @CreateDateColumn({ name: "created_at", type: "timestamp", precision: 0 })
  readonly createdAt = new Date();

  @UpdateDateColumn({ name: "updated_at", type: "timestamp", precision: 0 })
  readonly updatedAt = new Date();
}
function DateColumn(): (target: UserSpot, propertyKey: "createdAt") => void {
  throw new Error("Function not implemented.");
}
