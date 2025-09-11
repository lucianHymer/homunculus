# Claude Subprocess Configuration

## Tool Whitelisting
Claude subprocesses require explicit tool whitelisting to execute commands. The server uses the `--allowed-tools` flag with patterns.

### Whitelisted Tools
- `Bash(gh:*)` - All gh CLI commands
- `Bash(git:*)` - All git commands
- `Read` - File reading
- `Write` - File writing
- `Edit` - File editing
- `MultiEdit` - Multiple file edits
- `Grep` - Pattern searching
- `Glob` - File pattern matching
- `TodoWrite` - Task management

## Security Model
- Commands are blocked by default without whitelisting
- Whitelisting bypasses default command approval mechanism
- Maintains security boundaries while allowing necessary operations

## Related Files
- `server.js` - Tool whitelisting implementation
- `test-claude-subprocess.js` - Testing utilities