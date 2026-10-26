// Artillery hooks for guests.yml. CommonJS so Artillery can require it from this ESM package.

// Only a successful submission (201 new, 200 duplicate/upvote) has a request to vote on. Policy
// rejections (409 queue caps or ended room, 429 limits) carry no request, so clear the previous
// iteration's ID and let the vote step skip.
function rememberSubmittedRequest(req, res, context, events, next) {
    let requestId;
    if (res.statusCode === 200 || res.statusCode === 201) {
        try {
            requestId = JSON.parse(res.body)?.request?._id;
        } catch {
            requestId = undefined;
        }
    }
    context.vars.requestId = requestId ?? "";
    context.vars.submitted = requestId ? 1 : 0;
    return next();
}

module.exports = { rememberSubmittedRequest };
