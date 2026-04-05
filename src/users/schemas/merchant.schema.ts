import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MerchantDocument = Merchant & Document;

@Schema({ timestamps: true })
export class Merchant {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ required: true })
  storeName: string;

  @Prop({ required: true })
  storeEmail: string;

  @Prop()
  gstNumber?: string;

  @Prop()
  contactNumber?: string;

  @Prop()
  storeLocation?: string;

  @Prop({ default: 'active' })
  status: 'active' | 'inactive';

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const MerchantSchema = SchemaFactory.createForClass(Merchant);

MerchantSchema.index({ userId: 1 }, { unique: true });
MerchantSchema.index({ storeEmail: 1 });
