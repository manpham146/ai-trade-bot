import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CandleDocument = Candle & Document;

@Schema({
  timestamps: true,
  collection: 'candles',
})
export class Candle {
  @Prop({ required: true, index: true })
  symbol: string; // e.g., 'BTC/USDT'

  @Prop({ required: true, index: true })
  timeframe: string; // e.g., '1h', '4h'

  @Prop({ required: true, index: true })
  timestamp: Date; // Candle open time

  @Prop({ required: true })
  open: number; // Opening price

  @Prop({ required: true })
  high: number; // Highest price

  @Prop({ required: true })
  low: number; // Lowest price

  @Prop({ required: true })
  close: number; // Closing price

  @Prop({ required: true })
  volume: number; // Trading volume

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const CandleSchema = SchemaFactory.createForClass(Candle);

// Add compound indexes for efficient queries
CandleSchema.index({ symbol: 1, timeframe: 1, timestamp: 1 }); // Compound index for efficient queries
CandleSchema.index({ timestamp: 1 }); // Index for time-based queries
CandleSchema.index({ symbol: 1 }); // Index for symbol-based queries