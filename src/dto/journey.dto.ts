import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * Practice Question Submission DTO
 * Handles submission of practice question attempts
 */
export class SubmitPracticeQuestionDto {
  @IsNotEmpty({ message: "Question ID is required" })
  @IsString()
  question_id!: string;

  @IsNotEmpty({ message: "Is correct is required" })
  @IsBoolean()
  is_correct!: boolean;

  @IsOptional()
  @IsNumber()
  points_earned?: number;

  @IsOptional()
  response_data?: any;
}

/**
 * Final Challenge Question Result DTO
 */
export class FinalChallengeResultDto {
  @IsNotEmpty({ message: "Question ID is required" })
  @IsString()
  question_id!: string;

  @IsNotEmpty({ message: "Is correct is required" })
  @IsBoolean()
  is_correct!: boolean;

  @IsOptional()
  @IsNumber()
  points_earned?: number;

  @IsOptional()
  response_data?: any;
}

/**
 * Submit Final Challenge DTO
 * Batch submission of all final challenge results
 */
export class SubmitFinalChallengeDto {
  @IsNotEmpty({ message: "Results are required" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FinalChallengeResultDto)
  results!: FinalChallengeResultDto[];

  @IsOptional()
  @IsBoolean()
  is_passed?: boolean;

  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsNumber()
  max_score?: number;

  @IsOptional()
  extra_data?: any;
}

/**
 * Practice Question Progress Response
 */
export class PracticeQuestionProgressDto {
  id!: string;
  is_correct!: boolean;
  attempt_number!: number;
  points_earned!: number;
  stars!: 0 | 1 | 2 | 3;
  response_data?: any;
  created_at!: string;
}

/**
 * Practice Card Full Status Response
 */
export class PracticeCardStatusDto {
  step_id!: string;
  total_questions!: number;
  correctly_answered!: number;
  total_score!: number;
  stars!: 0 | 1 | 2 | 3;
  completed!: boolean;
  questions?: Record<string, any>;
}

/**
 * Final Challenge Status Response
 */
export class FinalChallengeStatusDto {
  step_id!: string;
  is_passed!: boolean;
  score!: number;
  max_score!: number;
  total_questions!: number;
  correctly_answered!: number;
  stars!: 0 | 1 | 2 | 3;
  completed!: boolean;
  passed_percentage!: number;
  questions?: Record<string, any>;
}

/**
 * Lesson Completion Celebration Response
 */
export class LessonCompletionDto {
  lesson_id!: string;
  lesson_title!: string;
  is_passed!: boolean;
  passed_percentage!: number;
  stars!: 0 | 1 | 2 | 3;
  next_level_unlocked?: {
    level_id: string;
    level_title: string;
    first_step_id: string;
  };
  celebration_message?: string;
}

/**
 * Unified Question Answer Submission DTO
 * Handles both practice and final challenge question answers
 * Supports flexible answer formats (text, choice ID, etc.)
 */
export class SubmitAnswerDto {
  @IsNotEmpty({ message: "Answer is required" })
  answer!: string | number | boolean | Record<string, any>;

  @IsOptional()
  response_data?: Record<string, any>;
}

/**
 * Milestone Badge DTO
 * Represents a badge awarded when completing a level
 */
export class MilestoneBadgeDto {
  badge_id!: string;
  badge_name!: string;
  badge_icon_url?: string;
  level_id!: string;
  level_title!: string;
  awarded_at!: string;
  description?: string;
}

/**
 * Question Answer Response DTO
 * Immediate feedback after submitting an answer
 */
export class QuestionAnswerResponseDto {
  question_id!: string;
  isCorrect!: boolean;
  correctAnswer?: string | number | boolean | Record<string, any>;
  yourAnswer!: string | number | boolean | Record<string, any>;
  starsEarned!: 0 | 1 | 2 | 3;
  currentAttempt!: number;
  attemptsLeft!: number;
  maxAttemptsAllowed!: number;
  badgeAwarded!: boolean;
  badge?: MilestoneBadgeDto;
  feedback?: string;
  message!: string;
}
