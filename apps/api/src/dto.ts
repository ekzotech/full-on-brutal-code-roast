import {
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from 'class-validator';

const slug = /^[a-z][a-z0-9-]{0,39}$/;
const hasText = /\S/u;
const noNull = /^[^\0]*$/u;

@ValidatorConstraint({ name: 'codeSize' })
class CodeSize implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return (
      typeof value === 'string' &&
      hasText.test(value) &&
      noNull.test(value) &&
      Buffer.byteLength(value, 'utf8') <= 51200
    );
  }

  defaultMessage() {
    return 'Code must contain text and fit within 51,200 UTF-8 bytes';
  }
}

export class CreatePaste {
  @IsString()
  @Length(1, 120)
  @Matches(hasText)
  @Matches(noNull)
  title!: string;

  @IsString()
  @Matches(slug)
  language!: string;

  @Validate(CodeSize)
  code!: string;
}

export class UpdatePaste {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  expectedRevision!: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(1, 120)
  @Matches(hasText)
  @Matches(noNull)
  title?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(slug)
  language?: string;

  @ValidateIf((_, value) => value !== undefined)
  @Validate(CodeSize)
  code?: string;
}

export class UpdateComment {
  @IsString()
  @Length(1, 2000)
  @Matches(hasText)
  @Matches(noNull)
  body!: string;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number | null;
}

export class CreateComment extends UpdateComment {
  @IsInt()
  @Min(1)
  @Max(51200)
  startLine!: number;

  @IsInt()
  @Min(1)
  @Max(51200)
  endLine!: number;
}
