# Command Invocation Patterns

## Current Pattern: Triple-Slash Commands
The project uses `///` command pattern instead of @mentions for triggering Claude in GitHub issues and PRs.

### Command Syntax
- `/// [review]` - For issue review and analysis
- `/// [accept]` - For implementing solutions from issues
- `///` - In PR reviews for addressing feedback

## Evolution History
1. **Original**: @homunculus mentions
2. **Current**: /// command pattern (cleaner, more concise)

## Rationale
- Avoids GitHub username conflicts ("homunculus" already taken)
- Doesn't require GitHub App or user account
- Clear, distinctive syntax
- Easy to parse in webhook payloads

## Related Files
- `README.md` - User documentation
- `server.js` - Command parsing implementation