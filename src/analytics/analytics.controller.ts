import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('device-breakdown')
  async getDeviceBreakdown() {
    return {
      success: true,
      data: await this.analyticsService.getDeviceBreakdown(),
    };
  }

  @Get('top-regions')
  async getTopRegions() {
    return { success: true, data: await this.analyticsService.getTopRegions() };
  }

  @Get('top-pages')
  async getTopPages() {
    return { success: true, data: await this.analyticsService.getTopPages() };
  }

  @Get('events')
  async getEvents() {
    return { success: true, data: await this.analyticsService.getEvents() };
  }

  @Get('recent-activity')
  async getRecentActivity() {
    return {
      success: true,
      data: await this.analyticsService.getRecentActivity(),
    };
  }
}
