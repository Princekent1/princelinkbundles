const errors = {
  ValidationError: {
    status: 400,
    message: "The data provided is invalid",
    details: "",
  },
  NotFound: {
    status: 404,
    message: "Resource not found",
    details: "",
  },
  WrongCredentials: {
    status: 401,
    message: "Wrong credentials",
    details: "",
  },
  UserAlreadyExists: {
    status: 409,
    message: "User already exists",
    details: "",
  },
  AccountPending: {
    status: 401,
    message: "Account Pending",
    details: "Account pending admin approval"
  },
  AccountSuspended: {
    status: 401,
    message: "Account Suspended",
    details: "Account suspended, contact admin"
  },
  AccountRejected: {
    status: 401,
    message: "Account Rejected",
    details: "Account inactive, contact admin"
  },
  Unauthorized: {
    status: 401,
    message: "Unauthorized",
    details: "You must be logged in to access this resource",
  },
  Forbidden: {
    status: 403,
    message: "Forbidden",
    details: "You do not have permission to access this resource",
  },
  RateLimited: {
    status: 429,
    message: "Too many requests",
    details: "Please wait before trying again",
  },
  SomethingWentWrong: {
    status: 500,
    message: "Something went wrong, please try again.",
    details: "",
  },

};

type ErrorName = keyof typeof errors;

export const createErrorResponse = (error: ErrorName, details?: any) => {
  const resDetails = details ?? errors[error]?.details;
  return Response.json(
    { message: errors[error].message, details: resDetails },
    { status: errors[error].status },
  );
};
