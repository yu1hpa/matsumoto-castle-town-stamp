import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export default class Spot {
  constructor(name: string, desc: string, moredesc: string) {
    this.name = name;
    this.desc = desc;
    this.moredesc = moredesc;
  }
  @PrimaryGeneratedColumn("uuid")
  public id: string | undefined;

  @Column({ type: "varchar", length: 30 })
  public name: string;

  @Column({ type: "varchar" })
  public desc: string;

  @Column({ type: "varchar" })
  public moredesc: string;

  @CreateDateColumn({ name: "created_at", type: "timestamp", precision: 0 })
  readonly createdAt = new Date();

  @UpdateDateColumn({ name: "updated_at", type: "timestamp", precision: 0 })
  readonly updatedAt = new Date();
}
