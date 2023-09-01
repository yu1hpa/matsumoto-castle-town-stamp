import {
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export default class User {
  constructor(id: string) {
    this.id = id;
  }
  @PrimaryColumn()
  public id: string;

  @CreateDateColumn({ name: "created_at", type: "timestamp", precision: 0 })
  readonly createdAt = new Date();

  @UpdateDateColumn({ name: "updated_at", type: "timestamp", precision: 0 })
  readonly updatedAt = new Date();
}
