import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class SubmitBannerPromotionDto {
  @IsString()
  @IsNotEmpty()
  bannerTitle: string;

  @IsString()
  @IsNotEmpty()
  bannerCategory: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(https?:\/\/|data:image\/[a-zA-Z0-9.+-]+;base64,)/, {
    message: 'imageUrl must be a URL address or uploaded image data',
  })
  imageUrl: string;

  @IsArray()
  @IsString({ each: true })
  selectedDates: string[];

  @IsNumber()
  @Min(0)
  totalPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  platformFee?: number;

  @IsOptional()
  @IsString()
  recommendedSize?: string;
}
