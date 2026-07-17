import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { ArticleCategory } from '../../database/enums';

export class CreateArticleDto {
  @ApiProperty() @IsString() @Length(3, 200) title: string;
  @ApiProperty() @IsString() @Length(10, 300) summary: string;
  @ApiProperty() @IsString() @Length(20, 20000) content: string;
  @ApiProperty({ enum: ArticleCategory }) @IsEnum(ArticleCategory) category: ArticleCategory;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) readTimeMinutes?: number;
}

export class AddCommentDto {
  @ApiProperty() @IsString() @Length(1, 1000) content: string;
}
