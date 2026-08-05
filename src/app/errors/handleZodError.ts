import { ZodError, ZodIssue } from "zod";
import { TErrorDetails, TGenericErrorResponse } from "../interface/error";

const handleZodError = (err: ZodError): TGenericErrorResponse => {
  let message = "";
  const errorDetails: TErrorDetails = {
    issues: err.issues.map((issue: ZodIssue) => {
      const pathKey = issue.path[issue.path.length - 1];
      const path: string | number =
        typeof pathKey === "symbol" ? pathKey.toString() : (pathKey ?? "");

      message =
        message + issue.message == "Expected number, received string"
          ? path + " " + issue.message
          : message + ". " + issue.message;
      return {
        path,
        message: issue.message,
      };
    }),
  };

  const statusCode = 400;

  return {
    statusCode,
    message,
    errorDetails,
  };
};

export default handleZodError;
