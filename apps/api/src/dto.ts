import {
  IsInt, IsString, Length, Matches, Max, Min, ValidateIf,
  ValidatorConstraint, ValidatorConstraintInterface, Validate,
} from 'class-validator';

const slug = /^[a-z][a-z0-9-]{0,39}$/;
const hasText = /\S/u;
const noNull = /^[^\0]*$/u;

@ValidatorConstraint({ name: 'codeSize' })
class CodeSize implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && hasText.test(value) && noNull.test(value)
      && Buffer.byteLength(value, 'utf8') <= 51200;
  }

  defaultMessage() {
    return 'Code must contain text and fit within 51,200 UTF-8 bytes';
  }
}

export class CreatePaste {
  @IsString() @Length(1, 120) @Matches(hasText) @Matches(noNull)
  title!: string;

  @IsString() @Matches(slug)
  language!: string;

  @Validate(CodeSize)
  code!: string;
}
