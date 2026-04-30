﻿import { 
  Controller, Post, Body, Get, Put, Delete, Param, 
  UseGuards, Query, Ip, NotFoundException 
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
﻿import { 
  Controller, Post, Body, Get, Put, Delete, Param, 
  UseGuards, Query, Ip, InternalServerErrorException, NotFoundException 
﻿import {
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

||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
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
import { RedisService } from '../common/services/redis.service';

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
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  constructor(private readonly usersService: UsersService) {}
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  constructor(
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
  ) {}

  // ==================== USER REPORT ====================
  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  async reportUser(
    @Param('id') id: string,
    @CurrentUser() reporter: any,
    @Body() body: { reason: string; description?: string; evidenceUrls?: string[] }
  ) {
    const { reason, description, evidenceUrls } = body;
    const reporterId = reporter?.id || reporter?._id;
    if (!reporterId) {
      throw new Error('Authenticated user id not found');
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

  // ==================== ADMIN SUSPEND/UNSUSPEND ====================
  @Post('admin/users/:id/ban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async banUser(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('duration') duration: number,
    @CurrentUser() admin: any,
  ) {
    const user = await this.usersService.banUser(id, reason, admin.id, admin.email, duration);
    return { success: true, data: user };
  }
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  // ==================== PUBLIC ROUTES ====================
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

  @Post('admin/users/:id/unban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async unbanUser(
    @Param('id') id: string,
    @CurrentUser() admin: any,
  ) {
    const user = await this.usersService.unbanUser(id, admin.id, admin.email);
    return { success: true, data: user };
  }

  // ==================== PUBLIC ROUTES ====================
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
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
  async register(@Body() dto: RegisterDto, @Ip() ip: string) {
    const user = await this.usersService.register(dto);
    return { success: true, message: 'User registered successfully', data: user };
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  async register(@Body() registerDto: RegisterDto, @Ip() ip: string) {
    const user = await this.usersService.register(registerDto);
    return {
      success: true,
      message: 'User registered successfully',
      data: user,
    };
  async register(@Body() dto: RegisterDto) {
    const user = await this.usersService.register(dto);
    return {
      success: true,
      message: 'User registered successfully',
      data: user,
    };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Ip() ip: string) {
    const result = await this.usersService.login(dto, ip);
    return { success: true, message: 'Login successful', data: result };
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  async login(@Body() loginDto: LoginDto, @Ip() ip: string) {
    const result = await this.usersService.login(loginDto, ip);
    return {
      success: true,
      message: 'Login successful',
      data: result,
    };
  async login(@Body() dto: LoginDto) {
    const result = await this.usersService.login(dto);
    return { success: true, message: 'Login successful', data: result };
  }

  @Post('social-auth')
  async socialAuth(@Body() dto: SocialAuthDto, @Ip() ip: string) {
    const result = await this.usersService.socialAuth(dto, ip);
    return { success: true, message: 'Social login successful', data: result };
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  async socialAuth(@Body() socialAuthDto: SocialAuthDto, @Ip() ip: string) {
    const result = await this.usersService.socialAuth(socialAuthDto, ip);
    return {
      success: true,
      message: 'Social login successful',
      data: result,
    };
  async socialAuth(@Body() dto: SocialAuthDto) {
    const result = await this.usersService.socialAuth(dto);
    return { success: true, message: 'Social login successful', data: result };
  }

  @Post('refresh')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    const result = await this.usersService.refreshToken(dto.refreshToken);
    return { success: true, data: result };
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.usersService.refreshToken(refreshTokenDto.refreshToken);
    return {
      success: true,
      data: result,
    };
  async refreshToken(@Body() dto: RefreshTokenDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await this.usersService.refreshToken(dto.refreshToken);
    return { success: true, data: result };
  }

  @Get('dashboard/stats')
  async getDashboardStats() {
    const cacheKey = 'golo:users:dashboard:stats';
    const cached = await this.redisService.get<any>(cacheKey);
    if (cached) {
      return { success: true, data: cached, fromCache: true };
    }
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  // ==================== USER ROUTES (Any logged-in user) ====================
  // 🔴 IMPORTANT: Specific routes must come BEFORE dynamic :id routes
  @Get('dashboard/stats')
  async getDashboardStats() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const stats = await this.usersService.getDashboardStatsPublic();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { success: true, data: stats };
  }

    const stats = await this.usersService.getDashboardStatsPublic();
    await this.redisService.set(cacheKey, stats, 90);
    return { success: true, data: stats };
  }

  // ==================== USER ROUTES ====================
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  // ==================== USER ROUTES ====================
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: any, @Body() dto: RefreshTokenDto) {
    await this.usersService.logout(user.id, dto.refreshToken);
    return { success: true, message: 'Logout successful' };
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  async logout(@CurrentUser() user: any, @Body() refreshTokenDto: RefreshTokenDto) {
    await this.usersService.logout(user.id, refreshTokenDto.refreshToken);
    return {
      success: true,
      message: 'Logout successful',
    };
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
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
    return {
      success: true,
      data: profile,
    };
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

  @Get('merchant/profile')
  @UseGuards(JwtAuthGuard)
  async getMerchantProfile(@CurrentUser() user: any) {
    const data = await this.usersService.getMerchantProfile(user.id);
    return { success: true, data };
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  async updateProfile(@CurrentUser() user: any, @Body() updateData: any) {
    const profile = await this.usersService.updateProfile(user.id, updateData);
    return {
      success: true,
      message: 'Profile updated successfully',
      data: profile,
    };
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

  // Save pending merchant location (used when frontend couldn't submit coords during register)
  @Post('pending-location')
  async savePendingMerchantLocation(@Body() body: { email: string; address: string; latitude: number; longitude: number }) {
    const res = await this.usersService.savePendingMerchantLocation(body);
    return { success: true, data: res };
  }

  // Sync pending merchant location into merchant profile after login
  @Post('pending-location/sync')
  @UseGuards(JwtAuthGuard)
  async syncPendingMerchantLocation(@CurrentUser() user: any) {
    const res = await this.usersService.syncPendingMerchantLocation(user.id, user.email);
    return { success: true, data: res };
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@CurrentUser() user: any, @Body() data: any) {
    try {
      console.log(`[Controller] Updating profile for user ${user.id} with data:`, {
        hasName: !!data.name,
        hasEmail: !!data.email,
        hasProfilePhoto: !!data.profilePhoto,
        photoSize: data.profilePhoto ? 
          (Buffer.byteLength(data.profilePhoto, 'utf8') / 1024 / 1024).toFixed(2) + "MB" : 
          "N/A",
        hasInterests: !!data.profile?.interests,
      });
      
      const profile = await this.usersService.updateProfile(user.id, data);
      
      console.log(`[Controller] Profile updated successfully:`, {
        hasPhoto: !!profile.profilePhoto,
        interests: profile.profile?.interests?.length || 0,
      });
      
      return { 
        success: true, 
        message: 'Profile updated successfully', 
        data: profile 
      };
    } catch (error) {
      console.error(`[Controller] Error updating profile:`, error.message);
      throw error;
    }
  }

  // ==================== PASSWORD OTP ====================
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  // ==================== PASSWORD CHANGE with OTP ====================

  // ==================== PASSWORD OTP ====================
  @Post('send-password-otp')
  @UseGuards(JwtAuthGuard)
  async sendOTP(@CurrentUser() user: any) {
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  async sendPasswordChangeOTP(@CurrentUser() user: any) {
  async sendOTP(@CurrentUser() user: CurrentUserPayload) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await this.usersService.sendPasswordChangeOTP(user.id);
    return { success: true, message: 'OTP sent', data: result };
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
    return {
      success: true,
      message: 'OTP sent to your registered email address',
      data: result,
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { success: true, message: 'OTP sent', data: result };
  }

  @Post('verify-password-otp')
  @UseGuards(JwtAuthGuard)
  async verifyOTP(@CurrentUser() user: any, @Body() body: any) {
    const result = await this.usersService.verifyPasswordChangeOTP(user.id, body.otp);
    return { success: true, message: 'OTP verified', data: result };
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  async verifyPasswordChangeOTP(@CurrentUser() user: any, @Body() body: any) {
    const result = await this.usersService.verifyPasswordChangeOTP(user.id, body.otp);
    return {
      success: true,
      message: 'OTP verified successfully',
      data: result,
    };
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
  async changePassword(@CurrentUser() user: any, @Body() body: any) {
    const result = await this.usersService.changePasswordWithOTP(user.id, body.otp, body.newPassword);
    return { success: true, message: 'Password changed', data: result };
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  async changePasswordWithOTP(@CurrentUser() user: any, @Body() body: any) {
    const result = await this.usersService.changePasswordWithOTP(user.id, body.otp, body.newPassword);
    return {
      success: true,
      message: 'Password changed successfully',
      data: result,
    };
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

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePasswordDirect(@CurrentUser() user: any, @Body() body: { currentPassword: string; newPassword: string }) {
    const result = await this.usersService.changePasswordDirect(user.id, body.currentPassword, body.newPassword);
    return { success: true, message: 'Password changed successfully', data: result };
  }

  // ==================== WISHLIST ====================

||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  // ==================== WISHLIST ROUTES ====================

  // ==================== WISHLIST ====================
  @Get('wishlist')
  @UseGuards(JwtAuthGuard)
  async getWishlist(@CurrentUser() user: any) {
    return { success: true, data: await this.usersService.getWishlistAds(user.id) };
  }

  @Get('wishlist/ids')
  @UseGuards(JwtAuthGuard)
  async getWishlistIds(@CurrentUser() user: any) {
    return { success: true, data: await this.usersService.getWishlistIds(user.id) };
  }

  @Post('wishlist/:adId')
  @UseGuards(JwtAuthGuard)
  async toggleWishlist(@CurrentUser() user: any, @Param('adId') adId: string) {
    return { success: true, data: await this.usersService.toggleWishlist(user.id, adId) };
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  async getWishlistAds(@CurrentUser() user: any) {
    const data = await this.usersService.getWishlistAds(user.id);
    return { success: true, data };
  }

  @Get('wishlist/ids')
  @UseGuards(JwtAuthGuard)
  async getWishlistIds(@CurrentUser() user: any) {
    const data = await this.usersService.getWishlistIds(user.id);
    return { success: true, data };
  }

  @Post('wishlist/:adId')
  @UseGuards(JwtAuthGuard)
  async toggleWishlist(@CurrentUser() user: any, @Param('adId') adId: string) {
    const result = await this.usersService.toggleWishlist(user.id, adId);
    return {
      success: true,
      message: result.added ? 'Added to wishlist' : 'Removed from wishlist',
      data: result,
    };
  async getWishlist(@CurrentUser() user: CurrentUserPayload) {
    return {
      success: true,
      data: await this.usersService.getWishlistAds(user.id),
    };
  }

  // ==================== NOTIFICATIONS ====================
  @Get('notifications')
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  @Get('all')
  @Get('wishlist/ids')
  @UseGuards(JwtAuthGuard)
  async getNotifications(@CurrentUser() user: any) {
    return { success: true, data: await this.usersService.getNotifications(user.id) };
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  async getAllUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const users = await this.usersService.getAllUsers(parseInt(page), parseInt(limit));
    return {
      success: true,
      data: users,
    };
  async getWishlistIds(@CurrentUser() user: CurrentUserPayload) {
    return {
      success: true,
      data: await this.usersService.getWishlistIds(user.id),
    };
  }

  // ==================== ADMIN ====================
  @Get('admin/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminGetAllUsers() {
    return { success: true, data: await this.usersService.adminGetAllUsers() };
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  // 🔴 FIXED: Debug route - must come BEFORE the dynamic :id route
  @Get('debug/check/:id')
@UseGuards(JwtAuthGuard)
async debugCheckUser(@Param('id') id: string) {
  try {
    console.log(`Debug: Checking user with ID: ${id}`); // Add console.log for debugging
    const user = await this.usersService.getUserById(id);
    return {
      success: true,
      message: 'User found in UsersService',
      data: user,
    };
  } catch (error) {
    console.error(`Debug error: ${error.message}`); // Add error logging
    return {
      success: false,
      message: 'User not found in UsersService',
      error: error.message,
    };
  }
}

  // 🔴 FIXED: Dynamic route - must come AFTER all specific routes
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUserById(@Param('id') id: string) {
    try {
      const user = await this.usersService.getUserById(id);
      return {
        success: true,
        data: user,
      };
    } catch (error) {
      if (error.name === 'NotFoundException') {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  // ==================== ADMIN ONLY ROUTES ====================

  @Get('admin/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminGetAllUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const users = await this.usersService.adminGetAllUsers(parseInt(page), parseInt(limit));
    return {
      success: true,
      data: users,
    };
  }

  @Get('admin/users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminGetUserById(@Param('id') id: string) {
    const user = await this.usersService.adminGetUserById(id);
    return {
      success: true,
      data: user,
    };
  }

  @Put('admin/users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminUpdateUser(@Param('id') id: string, @Body() updateData: any, @CurrentUser() admin: any) {
    const user = await this.usersService.adminUpdateUser(id, updateData, admin.id, admin.email);
    return {
      success: true,
      message: 'User updated successfully by admin',
      data: user,
    };
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

  @Post('likes/product')
  @UseGuards(JwtAuthGuard)
  async likeProduct(
    @CurrentUser() user: any,
    @Body() body: { offerId: string; product?: any },
  ) {
    return {
      success: true,
      data: await this.usersService.likeProduct(user.id, body?.offerId, body?.product || null),
    };
  }

  @Get('merchant/liked-products')
  @UseGuards(JwtAuthGuard)
  async getMerchantLikedProducts(@CurrentUser() user: any, @Query('limit') limit?: string) {
    return {
      success: true,
      data: await this.usersService.getMerchantLikedProducts(user.id, limit ? Number(limit) : 10),
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

  @Post('notifications/:notificationId/read')
  @UseGuards(JwtAuthGuard)
  async markNotificationRead(
    @CurrentUser() user: any,
    @Param('notificationId') notificationId: string,
  ) {
    await this.usersService.markNotificationRead(notificationId, user.id);
    return { success: true };
  }

  @Post('notifications/read-all')
  @UseGuards(JwtAuthGuard)
  async markAllNotificationsRead(@CurrentUser() user: any) {
    await this.usersService.markAllNotificationsRead(user.id);
    return { success: true };
  }

  @Delete('notifications')
  @UseGuards(JwtAuthGuard)
  async deleteAllNotifications(@CurrentUser() user: any) {
    await this.usersService.deleteAllNotifications(user.id);
    return { success: true };
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
  async deleteUser(@Param('id') id: string, @CurrentUser() admin: any) {
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  async adminDeleteUser(@Param('id') id: string, @CurrentUser() admin: any) {
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() admin: CurrentUserPayload,
  ) {
    await this.usersService.adminDeleteUser(id, admin.id, admin.email);
    return { success: true };
  }

  // ==================== DYNAMIC ====================
  @Get(':id')
  async getUser(@Param('id') id: string) {
    return { success: true, data: await this.usersService.getUserById(id) };
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
    return {
      success: true,
      message: 'User deleted successfully by admin',
    };
  }

  @Post('admin/users/:id/ban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminBanUser(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser() admin: any) {
    const user = await this.usersService.banUser(id, reason, admin.id, admin.email);
    return {
      success: true,
      message: 'User banned successfully',
      data: user,
    };
  }

  @Post('admin/users/:id/unban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminUnbanUser(@Param('id') id: string, @CurrentUser() admin: any) {
    const user = await this.usersService.unbanUser(id, admin.id, admin.email);
    return {
      success: true,
      message: 'User unbanned successfully',
      data: user,
    };
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminGetStats() {
    const stats = await this.usersService.adminGetStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get('debug/exists/:id')
async debugUserExists(@Param('id') id: string) {
  try {
    const user = await this.usersService.findById(id);
    return {
      success: true,
      message: 'User found',
      data: user
    };
  } catch (error) {
    return {
      success: false,
      message: 'User not found',
      error: error.message,
      id: id
    };
    return { success: true };
  }

  // ==================== DYNAMIC ====================
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUser(@Param('id') id: string) {
    return { success: true, data: await this.usersService.getUserById(id) };
  }
}
