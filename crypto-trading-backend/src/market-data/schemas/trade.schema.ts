import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TradeDocument = Trade & Document;

export type TradeStatus = 'OPEN' | 'CLOSED';

@Schema({
  timestamps: true,
  collection: 'trades',
})
export class Trade {
  @Prop({ required: true, index: true })
  symbol: string;

  @Prop({ required: true })
  entryPrice: number;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true, index: true })
  status: TradeStatus;

  @Prop({ default: 0 })
  pnl: number;

  @Prop({ required: true })
  openTime: Date;

  @Prop()
  closeTime?: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const TradeSchema = SchemaFactory.createForClass(Trade);
TradeSchema.index({ symbol: 1, status: 1 });

