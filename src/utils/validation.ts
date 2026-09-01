import { ValidationError } from "class-validator";

export const formatValidationErrors = (errors: ValidationError[]) => {
  const result: { field: string; message: string }[] = [];

  const traverseErrors = (errs: ValidationError[]) => {
    errs.forEach(err => {
      if (err.constraints) {
        Object.values(err.constraints).forEach((message: string) => {
          result.push({ field: err.property, message });
        });
      }
      if (err.children && err.children.length > 0) {
        traverseErrors(err.children);
      }
    });
  };

  traverseErrors(errors);

  return result;
};
