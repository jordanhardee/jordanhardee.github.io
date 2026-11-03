// These are browser-only toys. User input is never evaluated or passed to a shell.
(function () {
  function openWindow(name) {
    document.dispatchEvent(new CustomEvent('xp:open-window', { detail: { window: name } }));
  }

  document.querySelectorAll('.nostalgia-launcher[data-launch]').forEach(button => {
    button.addEventListener('click', () => openWindow(button.dataset.launch));
  });

  function createTerminal(kind) {
    const form = document.getElementById(`${kind}-form`);
    const input = document.getElementById(`${kind}-input`);
    const output = document.getElementById(`${kind}-output`);
    const prompt = document.getElementById(`${kind}-prompt`);
    if (!form || !input || !output || !prompt) return;
    const history = [];
    let historyIndex = 0;
    let initialized = false;
    let cwd = kind === 'cmd' ? 'C:\\Users\\Guest' : '/home/kali';

    function write(message, className = '') {
      const line = document.createElement('p');
      line.textContent = message;
      if (className) line.className = className;
      output.append(line);
      while (output.children.length > 240) output.firstElementChild.remove();
      output.scrollTop = output.scrollHeight;
    }

    function updatePrompt() {
      prompt.textContent = kind === 'cmd' ? `${cwd}>` : `kali@jordanhardee:${cwd === '/home/kali' ? '~' : cwd}$`;
    }

    function runCommand(raw) {
      const line = raw.trim();
      const lower = line.toLowerCase();
      const [command] = lower.split(/\s+/);
      const argument = line.slice(command.length).trim();
      if (!line) return;
      write(`${prompt.textContent}${line}`, 'terminal-command');

      if (kind === 'cmd') {
        switch (command) {
          case 'help': write('HELP  DIR  CD  CLS  VER  WHOAMI  DATE  TIME  ECHO  TREE  TYPE'); break;
          case 'cls': output.replaceChildren(); break;
          case 'ver': write('Microsoft Windows XP [Version 5.1.2600] (simulated)'); break;
          case 'whoami': write('retro-pc\\guest'); break;
          case 'date': write(new Date().toLocaleDateString()); break;
          case 'time': write(new Date().toLocaleTimeString()); break;
          case 'echo': write(argument); break;
          case 'dir': write(` Directory of ${cwd}\n\n<DIR>  .\n<DIR>  ..\n<DIR>  Desktop\n<DIR>  Documents\n       README.TXT`); break;
          case 'tree': write('C:\\\n└── Users\n    └── Guest\n        ├── Desktop\n        ├── Documents\n        └── README.TXT'); break;
          case 'type': write(lower === 'type readme.txt' ? 'Welcome to a tiny fake Command Prompt on jordanhardee.com!' : 'The system cannot find the file specified.'); break;
          case 'cd':
            if (!argument) { write(cwd); break; }
            if (argument === '..') cwd = cwd.includes('\\') ? cwd.slice(0, cwd.lastIndexOf('\\')) || 'C:\\' : cwd;
            else if (['desktop', 'documents'].includes(argument.toLowerCase())) cwd = `C:\\Users\\Guest\\${argument[0].toUpperCase()}${argument.slice(1).toLowerCase()}`;
            else if (argument === '\\' || argument.toLowerCase() === 'c:\\') cwd = 'C:\\';
            else { write('The system cannot find the path specified.', 'terminal-error'); break; }
            updatePrompt(); break;
          default: write(`'${command}' is not recognized as an internal or external command. Try HELP.`, 'terminal-error');
        }
        return;
      }

      switch (command) {
        case 'help': write('help  ls  pwd  cd  clear  cat  uname  whoami  id  date  echo  ip  nmap'); break;
        case 'clear': output.replaceChildren(); break;
        case 'pwd': write(cwd); break;
        case 'ls': write('Desktop  Documents  Downloads  README.txt  tools'); break;
        case 'whoami': write('kali'); break;
        case 'id': write('uid=1000(kali) gid=1000(kali) groups=1000(kali),27(sudo) [simulated]'); break;
        case 'uname': write('Linux kali 6.12.0-kali-amd64 #1 SMP x86_64 GNU/Linux [simulated]'); break;
        case 'date': write(new Date().toString()); break;
        case 'echo': write(argument); break;
        case 'cat': write(lower === 'cat readme.txt' || lower === 'cat readme' ? 'Welcome! This is a pretend Kali Linux terminal. All results are local and simulated.' : `cat: ${argument || '(missing path)'}: No such file or directory`, lower.includes('readme') ? '' : 'terminal-error'); break;
        case 'ip': write('1: lo: <LOOPBACK,UP> mtu 65536\n    inet 127.0.0.1/8 scope host lo\n2: eth0: <BROADCAST,UP> mtu 1500\n    inet 192.0.2.10/24 scope global eth0 (example-only)'); break;
        case 'nmap': write('This is a simulation: no hosts scanned and no network traffic sent.'); break;
        case 'sudo': case 'ssh': case 'curl': case 'wget': write('Simulation only: no privileges, network connections, or commands are executed.'); break;
        case 'cd':
          if (!argument || argument === '~') cwd = '/home/kali';
          else if (argument === '..') cwd = cwd.slice(0, cwd.lastIndexOf('/')) || '/';
          else if (['desktop', 'documents', 'downloads', 'tools'].includes(argument.toLowerCase())) cwd = `/home/kali/${argument[0].toUpperCase()}${argument.slice(1).toLowerCase()}`;
          else { write(`cd: ${argument}: No such file or directory`, 'terminal-error'); break; }
          updatePrompt(); break;
        default: write(`${command}: command not found (try help)`, 'terminal-error');
      }
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      const value = input.value.slice(0, 220);
      if (value.trim()) {
        history.push(value);
        if (history.length > 80) history.shift();
      }
      historyIndex = history.length;
      runCommand(value);
      input.value = '';
      input.focus();
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowUp' && history.length) {
        event.preventDefault();
        historyIndex = Math.max(0, historyIndex - 1);
        input.value = history[historyIndex] || '';
      } else if (event.key === 'ArrowDown' && history.length) {
        event.preventDefault();
        historyIndex = Math.min(history.length, historyIndex + 1);
        input.value = history[historyIndex] || '';
      }
    });

    document.addEventListener('xp:window-opened', event => {
      if (event.detail?.window !== `${kind === 'cmd' ? 'cmd' : 'kali'}-terminal`) return;
      if (!initialized) {
        initialized = true;
        if (kind === 'cmd') {
          write('Microsoft Windows XP [Version 5.1.2600]');
          write('(C) Microsoft Corporation. All rights reserved.');
        } else {
          write('┌──(kali㉿jordanhardee)-[~]\n└─$ Welcome to Kali Linux (browser simulation)', 'terminal-banner');
        }
        write('Type HELP for available commands. Nothing here runs on your computer.');
      }
      input.focus({ preventScroll: true });
    });
  }

  createTerminal('cmd');
  createTerminal('kali');
})();
