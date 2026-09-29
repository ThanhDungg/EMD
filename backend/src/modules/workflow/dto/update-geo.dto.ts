import { PartialType } from '@nestjs/mapped-types';
import { CreateGeoDto } from './geo.dto.js';

export class UpdateGeoDto extends PartialType(CreateGeoDto) {}
