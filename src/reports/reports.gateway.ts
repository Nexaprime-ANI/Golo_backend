import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Logger, Optional } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ==================== INTERFACES ====================
interface JwtPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

interface ReportData {
  reportId: string;
  adId: string;
  reason: string;
  reportCount: number;
}

interface PingData {
  [key: string]: unknown;
}

@WebSocketGateway({
  namespace: '/reports',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ReportsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ReportsGateway.name);
  private adminSockets = new Set<string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Optional() private eventEmitter?: EventEmitter2,
  ) {
    // Listen for report events from the entire application
    if (this.eventEmitter) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.eventEmitter.on('report.submitted', (data: unknown) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        this.handleReportSubmitted(data as ReportData),
      );
    }
  }

  handleConnection(client: Socket) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const tokenFromAuth = client.handshake.auth?.token;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const tokenFromHeader = client.handshake.headers.authorization?.replace(
        'Bearer ',
        '',
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const token = tokenFromAuth || tokenFromHeader;

      if (!token) {
        this.logger.error('❌ WebSocket: No token provided');
        throw new WsException('Authentication token is required');
      }

      // Verify JWT token
      let decoded: JwtPayload;
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        decoded = this.jwtService.verify<JwtPayload>(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });
      } catch (jwtError) {
        const errorMessage =
          jwtError instanceof Error
            ? jwtError.message
            : 'JWT verification failed';
        this.logger.error(`❌ JWT verification failed: ${errorMessage}`);
        throw new WsException(`JWT verification failed: ${errorMessage}`);
      }

      // Only admins can connect to reports namespace
      if (decoded.role !== 'admin') {
        this.logger.error(
          `❌ Non-admin user tried to connect: ${decoded.sub} (role: ${decoded.role})`,
        );
        throw new WsException('Only admins can access reports');
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      client.data.userId = decoded.sub;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      client.data.userRole = decoded.role;

      // Track admin clients
      this.adminSockets.add(client.id);

      this.logger.log(
        `✅ Admin ${decoded.sub} connected to reports (Total admins: ${this.adminSockets.size})`,
      );

      // Send confirmation
      client.emit('connected', {
        message: 'Connected to report notifications',
        connectedAt: new Date().toISOString(),
        userId: decoded.sub,
        role: decoded.role,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Authentication failed';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `❌ Socket connection failed: ${errorMessage}`,
        errorStack,
      );
      client.emit('error', {
        message: errorMessage,
        status: 'error',
      });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.adminSockets.delete(client.id);
    this.logger.log(
      `❌ Admin disconnected from reports (Total admins: ${this.adminSockets.size})`,
    );
  }

  /**
   * Handle new report submitted event
   */
  @SubscribeMessage('ping')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: PingData) {
    void client; // Use the parameter to avoid unused variable error
    void data;
    return { pong: true, timestamp: new Date().toISOString() };
  }

  /**
   * Called by service/Kafka when a new report is submitted
   */
  public broadcastNewReport(reportData: ReportData) {
    if (this.server && this.adminSockets.size > 0) {
      this.logger.log(
        `📢 Broadcasting new report to ${this.adminSockets.size} admins`,
      );
      this.server.emit('new_report', {
        reportId: reportData.reportId,
        adId: reportData.adId,
        reason: reportData.reason,
        reportCount: reportData.reportCount,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Internal handler for report submitted events
   */
  private handleReportSubmitted(data: ReportData) {
    this.broadcastNewReport(data);
  }

  /**
   * Get connected admins count (for monitoring)
   */
  @SubscribeMessage('get_status')
  handleGetStatus() {
    return this.getGatewayStatus();
  }

  public getGatewayStatus() {
    return {
      status: 'ok',
      adminsConnected: this.adminSockets.size,
      timestamp: new Date().toISOString(),
    };
  }
}
