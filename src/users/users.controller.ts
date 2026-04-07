import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Delete,
  Param,
  UseGuards,
  Query,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

import { UsersService } from './users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SocialAuthDto } from './dto/social-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from './schemas/user.schema';

// ==================== INTERFACES ====================
interface CurrentUserPayload {
  id: string;
  email: string;
  role: string;
  _id?: string;
}

interface UpdateManagerDto {
  // Add properties if needed
  [key: string]: unknown;
}

interface OtpBody {
  otp: string;
  newPassword?: string;
}

interface UpdateProfileDto {
  [key: string]: unknown;
}

interface UserReportBody {
  reason: string;
  description?: string;
  evidenceUrls?: string[];
}

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  // ==================== MANAGER ADMIN ====================
  @Get('admin/managers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminGetAllManagers() {
    return {
      success: true,
      data: await this.usersService.adminGetAllManagers(),
    };
  }

  @Get('admin/service-providers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminGetAllServiceProviders(
    @Query('page') page = '1',
    @Query('limit') limit = '100',
  ) {
    const p = parseInt(String(page), 10) || 1;
    const l = parseInt(String(limit), 10) || 100;
    const result = await this.usersService.getUsersByRole(
      UserRole.MERCHANT,
      p,
      l,
    );
    return { success: true, data: result.users, total: result.total };
  }

  @Post('admin/managers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminCreateManager(
    @Body() dto: RegisterDto,
    @CurrentUser() admin: CurrentUserPayload,
  ) {
    const manager = await this.usersService.adminCreateManager(
      dto,
      admin.id,
      admin.email,
    );
    return { success: true, data: manager };
  }

  @Put('admin/managers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminUpdateManager(
    @Param('id') id: string,
    @Body() dto: UpdateManagerDto,
    @CurrentUser() admin: CurrentUserPayload,
  ) {
    let rawId = String(id ?? '');
    try {
      rawId = decodeURIComponent(rawId);
    } catch {
      // ignore decode errors
    }
    rawId = rawId.trim().replace(/^\/+|\/+$/g, '');
    this.logger.debug(
      `adminUpdateManager called with rawId="${rawId}" (type=${typeof rawId}, len=${rawId.length})`,
    );
    if (!rawId || !isValidObjectId(rawId)) {
      throw new BadRequestException('Invalid manager id');
    }
    const manager = await this.usersService.adminUpdateManager(
      rawId,
      dto,
      admin.id,
      admin.email,
    );
    return { success: true, data: manager };
  }

  @Delete('admin/managers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminDeleteManager(
    @Param('id') id: string,
    @CurrentUser() admin: CurrentUserPayload,
  ) {
    let rawId = String(id ?? '');
    try {
      rawId = decodeURIComponent(rawId);
    } catch {
      // ignore decode errors
    }
    rawId = rawId.trim().replace(/^\/+|\/+$/g, '');
    this.logger.debug(
      `adminDeleteManager called with rawId="${rawId}" (type=${typeof rawId}, len=${rawId.length})`,
    );
    if (!rawId || !isValidObjectId(rawId)) {
      throw new BadRequestException('Invalid manager id');
    }
    await this.usersService.adminDeleteManager(rawId, admin.id, admin.email);
    return { success: true };
  }

  @Post('admin/managers/:id/discard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminDiscardManager(
    @Param('id') id: string,
    @CurrentUser() admin: CurrentUserPayload,
  ) {
    let rawId = String(id ?? '');
    try {
      rawId = decodeURIComponent(rawId);
    } catch {
      // ignore decode errors
    }
    rawId = rawId.trim().replace(/^\/+|\/+$/g, '');
    this.logger.debug(
      `adminDiscardManager called with rawId="${rawId}" (type=${typeof rawId}, len=${rawId.length})`,
    );
    if (!rawId || !isValidObjectId(rawId)) {
      throw new BadRequestException('Invalid manager id');
    }
    await this.usersService.adminDiscardManager(rawId, admin.id, admin.email);
    return { success: true };
  }

  // ==================== USER REPORT ====================
  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  async reportUser(
    @Param('id') id: string,
    @CurrentUser() reporter: CurrentUserPayload,
    @Body() body: UserReportBody,
  ) {
    const { reason, description, evidenceUrls } = body;
    const reporterId = reporter.id || reporter._id;
    if (!reporterId) {
      throw new BadRequestException('Authenticated user id not found');
    }
    const result = await this.usersService.submitUserReport(
      id,
      reporterId,
      reason,
      description,
      evidenceUrls,
    );
    return { success: true, ...result };
  }

  @Post('admin/users/:id/unban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async unbanUser(
    @Param('id') id: string,
    @CurrentUser() admin: CurrentUserPayload,
  ) {
    const user = await this.usersService.unbanUser(id, admin.id, admin.email);
    return { success: true, data: user };
  }

  // ==================== PUBLIC ROUTES ====================
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.usersService.register(dto);
    return {
      success: true,
      message: 'User registered successfully',
      data: user,
    };
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const result = await this.usersService.login(dto);
    return { success: true, message: 'Login successful', data: result };
  }

  @Post('social-auth')
  async socialAuth(@Body() dto: SocialAuthDto) {
    const result = await this.usersService.socialAuth(dto);
    return { success: true, message: 'Social login successful', data: result };
  }

  @Post('refresh')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await this.usersService.refreshToken(dto.refreshToken);
    return { success: true, data: result };
  }

  @Get('dashboard/stats')
  async getDashboardStats() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const stats = await this.usersService.getDashboardStatsPublic();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { success: true, data: stats };
  }

  // ==================== USER ROUTES ====================
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RefreshTokenDto,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    await this.usersService.logout(user.id, dto.refreshToken);
    return { success: true, message: 'Logout successful' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: CurrentUserPayload) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const profile = await this.usersService.getProfile(user.id);
    return { success: true, data: profile };
  }

  @Get('merchant/profile')
  @UseGuards(JwtAuthGuard)
  async getMerchantProfile(@CurrentUser() user: CurrentUserPayload) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const data = await this.usersService.getMerchantProfile(user.id);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { success: true, data };
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() data: UpdateProfileDto,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const profile = await this.usersService.updateProfile(user.id, data);
    return {
      success: true,
      message: 'Profile updated successfully',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: profile,
    };
  }

  // ==================== PASSWORD OTP ====================
  @Post('send-password-otp')
  @UseGuards(JwtAuthGuard)
  async sendOTP(@CurrentUser() user: CurrentUserPayload) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await this.usersService.sendPasswordChangeOTP(user.id);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { success: true, message: 'OTP sent', data: result };
  }

  @Post('verify-password-otp')
  @UseGuards(JwtAuthGuard)
  async verifyOTP(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: OtpBody,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await this.usersService.verifyPasswordChangeOTP(
      user.id,
      body.otp,
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { success: true, message: 'OTP verified', data: result };
  }

  @Post('change-password-otp')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: OtpBody,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await this.usersService.changePasswordWithOTP(
      user.id,
      body.otp,
      body.newPassword,
    );
    return { success: true, message: 'Password changed', data: result };
  }

  // ==================== WISHLIST ====================
  @Get('wishlist')
  @UseGuards(JwtAuthGuard)
  async getWishlist(@CurrentUser() user: CurrentUserPayload) {
    return {
      success: true,
      data: await this.usersService.getWishlistAds(user.id),
    };
  }

  @Get('wishlist/ids')
  @UseGuards(JwtAuthGuard)
  async getWishlistIds(@CurrentUser() user: CurrentUserPayload) {
    return {
      success: true,
      data: await this.usersService.getWishlistIds(user.id),
    };
  }

  @Post('wishlist/:adId')
  @UseGuards(JwtAuthGuard)
  async toggleWishlist(
    @CurrentUser() user: CurrentUserPayload,
    @Param('adId') adId: string,
  ) {
    return {
      success: true,
      data: await this.usersService.toggleWishlist(user.id, adId),
    };
  }

  // ==================== NOTIFICATIONS ====================
  @Get('notifications')
  @UseGuards(JwtAuthGuard)
  async getNotifications(@CurrentUser() user: CurrentUserPayload) {
    return {
      success: true,
      data: await this.usersService.getNotifications(user.id),
    };
  }

  // ==================== ADMIN ====================
  @Get('admin/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminGetAllUsers() {
    return { success: true, data: await this.usersService.adminGetAllUsers() };
  }

  @Delete('admin/users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() admin: CurrentUserPayload,
  ) {
    await this.usersService.adminDeleteUser(id, admin.id, admin.email);
    return { success: true };
  }

  // ==================== DYNAMIC ====================
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUser(@Param('id') id: string) {
    return { success: true, data: await this.usersService.getUserById(id) };
  }
}
