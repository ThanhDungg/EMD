import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { MeterPhase, MeterType } from '../../../generated/prisma/client.js';

export class CreateEnergyReadingDto {
  @IsOptional()
  @IsEnum(MeterPhase)
  phase?: MeterPhase;

  @Type(() => Number)
  @IsNumber()
  startIndex!: number;

  @Type(() => Number)
  @IsNumber()
  endIndex!: number;
}

export class CreateEnergyMeterDto {
  @IsString()
  meterCode!: string;

  @IsEnum(MeterType)
  meterType!: MeterType;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsBoolean()
  checkpoint?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEnergyReadingDto)
  readings?: CreateEnergyReadingDto[];
}

export class CreateEnergyCheckDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsDateString()
  checkTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  workId?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEnergyMeterDto)
  meters?: CreateEnergyMeterDto[];
}
