import { 
  Controller, Post, Body, Get, Put, Delete, Param, 
  UseGuards, Query, Ip, NotFoundException 
} from '@nestjs/common';

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

@Controller('users')
export class UsersController {

  constructor(private readonly usersService: UsersService) {}

  // ==================== MANAGER ADMIN ====================
  @Get('admin/managers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminGetAllManagers() {
    return { success: true, data: await this.usersService.adminGetAllManagers() };
  }

  @Post('admin/managers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminCreateManager(@Body() dto: RegisterDto, @CurrentUser() admin: any) {
    const manager = await this.usersService.adminCreateManager(dto, admin.id, admin.email);
    return { success: true, data: manager };
  }

  @Put('admin/managers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminUpdateManager(@Param('id') id: string, @Body() dto: any, @CurrentUser() admin: any) {
    const manager = await this.usersService.adminUpdateManager(id, dto, admin.id, admin.email);
    return { success: true, data: manager };
  }

  @Delete('admin/managers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminDeleteManager(@Param('id') id: string, @CurrentUser() admin: any) {
    await this.usersService.adminDeleteManager(id, admin.id, admin.email);
    return { success: true };
  }

  @Post('admin/managers/:id/discard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminDiscardManager(@Param('id') id: string, @CurrentUser() admin: any) {
    await this.usersService.adminDiscardManager(id, admin.id, admin.email);
    return { success: true };
  }

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
  @Post('register')
  async register(@Body() dto: RegisterDto, @Ip() ip: string) {
    const user = await this.usersService.register(dto);
    return { success: true, message: 'User registered successfully', data: user };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Ip() ip: string) {
    const result = await this.usersService.login(dto, ip);
    return { success: true, message: 'Login successful', data: result };
  }

  @Post('social-auth')
  async socialAuth(@Body() dto: SocialAuthDto, @Ip() ip: string) {
    const result = await this.usersService.socialAuth(dto, ip);
    return { success: true, message: 'Social login successful', data: result };
  }

  @Post('refresh')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    const result = await this.usersService.refreshToken(dto.refreshToken);
    return { success: true, data: result };
  }

  @Get('dashboard/stats')
  async getDashboardStats() {
    const stats = await this.usersService.getDashboardStatsPublic();
    return { success: true, data: stats };
  }

  // ==================== USER ROUTES ====================
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: any, @Body() dto: RefreshTokenDto) {
    await this.usersService.logout(user.id, dto.refreshToken);
    return { success: true, message: 'Logout successful' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: any) {
    const profile = await this.usersService.getProfile(user.id);
    return { success: true, data: profile };
  }

  @Get('merchant/profile')
  @UseGuards(JwtAuthGuard)
  async getMerchantProfile(@CurrentUser() user: any) {
    const data = await this.usersService.getMerchantProfile(user.id);
    return { success: true, data };
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@CurrentUser() user: any, @Body() data: any) {
    const profile = await this.usersService.updateProfile(user.id, data);
    return { success: true, message: 'Profile updated successfully', data: profile };
  }

  // ==================== PASSWORD OTP ====================
  @Post('send-password-otp')
  @UseGuards(JwtAuthGuard)
  async sendOTP(@CurrentUser() user: any) {
    const result = await this.usersService.sendPasswordChangeOTP(user.id);
    return { success: true, message: 'OTP sent', data: result };
  }

  @Post('verify-password-otp')
  @UseGuards(JwtAuthGuard)
  async verifyOTP(@CurrentUser() user: any, @Body() body: any) {
    const result = await this.usersService.verifyPasswordChangeOTP(user.id, body.otp);
    return { success: true, message: 'OTP verified', data: result };
  }

  @Post('change-password-otp')
  @UseGuards(JwtAuthGuard)
  async changePassword(@CurrentUser() user: any, @Body() body: any) {
    const result = await this.usersService.changePasswordWithOTP(user.id, body.otp, body.newPassword);
    return { success: true, message: 'Password changed', data: result };
  }

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
  }

  // ==================== NOTIFICATIONS ====================
  @Get('notifications')
  @UseGuards(JwtAuthGuard)
  async getNotifications(@CurrentUser() user: any) {
    return { success: true, data: await this.usersService.getNotifications(user.id) };
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