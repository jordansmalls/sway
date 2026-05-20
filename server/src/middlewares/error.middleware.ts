/**
 * @description generic express error handling middleware. catches errors passed via `next(err)` and formats a JSON response. specifically handles Mongoose 'CastError' for invalid ObjectIds, setting the status to 404. includes the error stack in development environment only.
 * @param {object} err - error object passed by `next(err)`
 * @param {object} req - express request object
 * @param {object} res - express response object
 * @param {function} next - express next middleware function (unused in final handler)
 */

const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;

    // If Mongoose not found error, set to 404 and change message
    if (err.name === "CastError" && err.kind === "ObjectId") {
        statusCode = 404;
        message = "Resource not found";
    }

    res.status(statusCode).json({
        message: message,
        stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
};

export { errorHandler };
