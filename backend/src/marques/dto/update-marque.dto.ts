import { PartialType } from '@nestjs/mapped-types';
import { CreateMarqueDto } from './create-marque.dto';

export class UpdateMarqueDto extends PartialType(CreateMarqueDto) {}
