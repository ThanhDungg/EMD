import { IsOptional, IsString } from 'class-validator';

export class CreateIncidentTypeDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;
}
