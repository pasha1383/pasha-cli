'use strict';
const log = require('../../utils/logger');

// Kept in sync with the commands registered in src/cli/index.js. Commander
// 12.x (the version this project depends on) has no built-in completion
// script generator, so these are hand-written static scripts.
const COMMANDS = ['create', 'doctor', 'add', 'explain', 'list', 'update', 'completion'];

const CREATE_FLAGS = [
  '--yes', '-y', '--language', '-l', '--framework', '-f', '--architecture', '-a',
  '--orm', '--database', '--validation', '--broker', '--redis', '--no-redis',
  '--extras', '--modules', '--project-name', '--author', '--github', '--description',
  '--agent-docs', '--no-agent-docs', '--skip-install', '--skip-git', '--dry-run',
  '--preset', '-p', '--save-preset', '--resume', '-r', '--plain', '--no-animation',
];

const UPDATE_FLAGS = ['--check'];

function installHeader(shell) {
  return [
    `# pasha ${shell} completion`,
    '#',
    '# Install:',
    '#   bash: pasha completion bash >> ~/.bashrc',
    '#   zsh:  pasha completion zsh >> ~/.zshrc  (or add to a directory in $fpath)',
    '#   fish: pasha completion fish > ~/.config/fish/completions/pasha.fish',
    '',
  ].join('\n');
}

function bashScript() {
  return `${installHeader('bash')}
_pasha_completions() {
  local cur prev words cword
  _init_completion 2>/dev/null || {
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"
  }

  local commands="${COMMANDS.join(' ')}"
  local create_flags="${CREATE_FLAGS.join(' ')}"
  local update_flags="${UPDATE_FLAGS.join(' ')}"
  local completion_shells="bash zsh fish"

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
    return 0
  fi

  case "\${COMP_WORDS[1]}" in
    create)
      COMPREPLY=( $(compgen -W "\${create_flags}" -- "\${cur}") )
      ;;
    update)
      COMPREPLY=( $(compgen -W "\${update_flags}" -- "\${cur}") )
      ;;
    add)
      COMPREPLY=( $(compgen -W "module feature" -- "\${cur}") )
      ;;
    completion)
      COMPREPLY=( $(compgen -W "\${completion_shells}" -- "\${cur}") )
      ;;
    *)
      COMPREPLY=()
      ;;
  esac
  return 0
}

complete -F _pasha_completions pasha
`;
}

function zshScript() {
  return `${installHeader('zsh')}
#compdef pasha

_pasha() {
  local -a commands
  commands=(
    'create:Scaffold a new project'
    'doctor:Check and install system prerequisites'
    'add:Add a module or feature to an existing project'
    'explain:Show the resolved layer tree for a recipe'
    'list:List available languages, frameworks, and architectures'
    'update:Check for and install pasha updates'
    'completion:Print a shell completion script'
  )

  if (( CURRENT == 2 )); then
    _describe -t commands 'pasha command' commands
    return
  fi

  case "\${words[2]}" in
    create)
      local -a create_flags
      create_flags=(${CREATE_FLAGS.map((f) => `'${f}'`).join(' ')})
      _describe -t create_flags 'create flag' create_flags
      ;;
    update)
      local -a update_flags
      update_flags=(${UPDATE_FLAGS.map((f) => `'${f}'`).join(' ')})
      _describe -t update_flags 'update flag' update_flags
      ;;
    add)
      local -a add_targets
      add_targets=('module' 'feature')
      _describe -t add_targets 'add target' add_targets
      ;;
    completion)
      local -a shells
      shells=('bash' 'zsh' 'fish')
      _describe -t shells 'shell' shells
      ;;
  esac
}

compdef _pasha pasha
`;
}

function fishScript() {
  const lines = [installHeader('fish')];

  const commandDescriptions = {
    create: 'Scaffold a new project',
    doctor: 'Check and install system prerequisites',
    add: 'Add a module or feature to an existing project',
    explain: 'Show the resolved layer tree for a recipe',
    list: 'List available languages, frameworks, and architectures',
    update: 'Check for and install pasha updates',
    completion: 'Print a shell completion script',
  };

  lines.push('complete -c pasha -f');
  for (const cmd of COMMANDS) {
    const desc = commandDescriptions[cmd] || '';
    lines.push(`complete -c pasha -n '__fish_use_subcommand' -a '${cmd}' -d '${desc}'`);
  }

  for (const flag of CREATE_FLAGS) {
    if (!flag.startsWith('--')) continue;
    const name = flag.replace(/^--/, '');
    lines.push(`complete -c pasha -n '__fish_seen_subcommand_from create' -l '${name}'`);
  }

  for (const flag of UPDATE_FLAGS) {
    const name = flag.replace(/^--/, '');
    lines.push(`complete -c pasha -n '__fish_seen_subcommand_from update' -l '${name}'`);
  }

  lines.push(`complete -c pasha -n '__fish_seen_subcommand_from add' -a 'module feature'`);
  lines.push(`complete -c pasha -n '__fish_seen_subcommand_from completion' -a 'bash zsh fish'`);

  return lines.join('\n') + '\n';
}

const GENERATORS = {
  bash: bashScript,
  zsh: zshScript,
  fish: fishScript,
};

/**
 * `pasha completion <shell>` — prints a shell completion script to stdout.
 *
 * @param {string} shell  'bash' | 'zsh' | 'fish'
 */
async function completion(shell) {
  const generator = GENERATORS[shell];
  if (!generator) {
    log.fail(`Unsupported shell: "${shell}". Supported shells: ${Object.keys(GENERATORS).join(', ')}.`);
    process.exit(1);
    return;
  }
  console.log(generator());
}

module.exports = { completion, COMMANDS, CREATE_FLAGS, UPDATE_FLAGS };
