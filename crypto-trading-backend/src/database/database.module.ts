import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const mongoUri = configService.get<string>('MONGODB_URI');
        const logger = new Logger('DatabaseModule');
        
        if (!mongoUri) {
          throw new Error('MONGODB_URI is not defined in environment variables');
        }

        logger.log('Connecting to MongoDB...', 'DatabaseConnection', {
          uri: mongoUri.replace(/mongodb:\/\/([^@]+@)?/, 'mongodb://****:****@'),
        });
        
        return {
          uri: mongoUri,
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              logger.log('MongoDB connected successfully', 'DatabaseConnection', {
                host: connection.host,
                port: connection.port,
                name: connection.name,
              });
            });
            
            connection.on('error', (error) => {
              logger.error('MongoDB connection error', 'DatabaseConnection', {
                error: error.message,
                stack: error.stack,
              });
            });
            
            connection.on('disconnected', () => {
              logger.warn('MongoDB disconnected', 'DatabaseConnection');
            });
            
            return connection;
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}