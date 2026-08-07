export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export class UnauthorizedException extends HttpError {
  constructor(message = "Unauthorized") {
    super(401, message);
    this.name = "UnauthorizedException";
  }
}

export class BadRequestException extends HttpError {
  constructor(message = "Bad Request") {
    super(400, message);
    this.name = "BadRequestException";
  }
}

export class ForbiddenException extends HttpError {
  constructor(message = "Forbidden") {
    super(403, message);
    this.name = "ForbiddenException";
  }
}

export class NotFoundException extends HttpError {
  constructor(message = "Not Found") {
    super(404, message);
    this.name = "NotFoundException";
  }
}

export class ConflictException extends HttpError {
  constructor(message = "Conflict") {
    super(409, message);
    this.name = "ConflictException";
  }
}

export class InternalServerErrorException extends HttpError {
  constructor(message = "Internal Server Error") {
    super(500, message);
    this.name = "InternalServerErrorException";
  }
}
