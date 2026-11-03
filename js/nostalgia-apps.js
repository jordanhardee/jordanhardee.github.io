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
    let cwd = kind === 'cmd' ? 'C:\\Users\\Guest' : '/root';
    const kaliTools = [
      'aircrack-ng', 'airmon-ng', 'airodump-ng', 'arpspoof', 'burpsuite', 'crunch',
      'ettercap', 'hashcat', 'hydra', 'john', 'maltego', 'msfconsole', 'msfvenom',
      'netcat', 'nikto', 'nmap', 'reaver', 'sqlmap', 'tcpdump', 'theharvester',
      'wash', 'wireshark', 'wifite', 'wpscan', 'yersinia',
    ];

    function write(message, className = '') {
      const line = document.createElement('p');
      line.textContent = message;
      if (className) line.className = className;
      output.append(line);
      while (output.children.length > 240) output.firstElementChild.remove();
      output.scrollTop = output.scrollHeight;
    }

    function updatePrompt() {
      prompt.textContent = kind === 'cmd' ? `${cwd}>` : `root@kali:${cwd === '/root' ? '~' : cwd}# `;
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
        case 'help':
          write('Kali Linux 2.0 (Sana) · 2015-era terminal\n\nBASIC: help  ls  pwd  cd  clear  cat  uname  whoami  id  date  echo  ifconfig  iwconfig  netstat  dpkg\n\nSECURITY TOOLS:\n' + kaliTools.join('  ') + '\n\nTry: ls /usr/bin, ls /usr/share, nmap --version, msfconsole --version, aircrack-ng --help. All tool output is simulated; nothing executes.');
          break;
        case 'clear': output.replaceChildren(); break;
        case 'pwd': write(cwd); break;
        case 'ls':
          if (/^\/usr\/(bin|sbin)\/?$/.test(argument)) write(kaliTools.join('  '));
          else if (argument === '/usr/share' || argument === '/usr/share/') write('aircrack-ng  doc  john  metasploit-framework  nmap  sqlmap  wordlists  wireshark');
          else if (argument === '/usr/share/wordlists') write('dirb  fasttrack.txt  john.lst  metasploit  rockyou.txt.gz');
          else if (cwd === '/root') write('Desktop  Documents  Downloads  README.txt');
          else if (cwd === '/usr/share') write('aircrack-ng  doc  john  metasploit-framework  nmap  sqlmap  wordlists  wireshark');
          else if (cwd === '/usr/share/wordlists') write('dirb  fasttrack.txt  john.lst  metasploit  rockyou.txt.gz');
          else write('README.txt');
          break;
        case 'whoami': write('root'); break;
        case 'id': write('uid=0(root) gid=0(root) groups=0(root) [simulated]'); break;
        case 'uname': write('Linux kali 4.0.0-kali1-amd64 #1 SMP Debian x86_64 GNU/Linux [simulated, 2015]'); break;
        case 'date': write(new Date().toString()); break;
        case 'echo': write(argument); break;
        case 'cat': write(lower === 'cat readme.txt' || lower === 'cat readme' ? 'Kali Linux 2.0 Sana (2015). This is a purely local browser terminal; no tools are actually installed or executed.' : `cat: ${argument || '(missing path)'}: No such file or directory`, lower.includes('readme') ? '' : 'terminal-error'); break;
        case 'ip': case 'ifconfig': write('eth0      Link encap:Ethernet  HWaddr 00:00:5e:00:53:01\n          inet addr:192.0.2.10  Bcast:192.0.2.255  Mask:255.255.255.0\nlo        Link encap:Local Loopback\n          inet addr:127.0.0.1  Mask:255.0.0.0\n[SIMULATED TEST-NET ADDRESS]'); break;
        case 'iwconfig': write('eth0      no wireless extensions.\nlo        no wireless extensions.\n[SIMULATED]'); break;
        case 'netstat': write('Active Internet connections (only servers)\nProto Recv-Q Send-Q Local Address   Foreign Address State\n[SIMULATED: no network access]'); break;
        case 'dpkg': write(argument === '-l' || argument === '--list' ? 'ii  aircrack-ng  1:1.2-0~rc2\nii  metasploit-framework  4.11\nii  nmap  6.49BETA4\nii  john  1.8.0\nii  sqlmap  1.0\n[FICTIONAL PACKAGE LIST]' : 'Try dpkg -l to see the simulated vintage tools.'); break;
        case 'nmap':
          if (/^(-v|--version)$/i.test(argument)) write('Nmap version 6.49BETA4 ( https://nmap.org ) [simulated]');
          else if (/^(-h|--help)$/i.test(argument)) write('Nmap 6.49BETA4: nmap [Scan Type(s)] [Options] {target specification}\n-sS TCP SYN scan  -sV Service version  -O OS detection  -Pn Skip host discovery\n[SIMULATED]');
          else write('Nmap 6.49BETA4 demo mode: no network traffic sent; no host was scanned.');
          break;
        case 'msfconsole': case 'msfvenom': case 'aircrack-ng': case 'airmon-ng': case 'airodump-ng': case 'john': case 'hashcat': case 'hydra': case 'sqlmap': case 'nikto': case 'reaver': case 'wifite': case 'wireshark': case 'burpsuite': case 'ettercap': case 'tcpdump': case 'netcat': case 'nc': case 'arpspoof': case 'crunch': case 'maltego': case 'theharvester': case 'wash': case 'wpscan': case 'yersinia':
          write(`${command}: ${/^(-v|--version|-h|--help)$/.test(argument) ? 'historical Kali 2.0 command recognized' : 'demo only; command not executed'}\n[LOCAL BROWSER SIMULATION · no system or network access]`);
          break;
        case 'sudo': case 'ssh': case 'curl': case 'wget': write('Simulation only: no privileges, network connections, or commands are executed.'); break;
        case 'cd':
          if (!argument || argument === '~') cwd = '/root';
          else if (argument === '..') cwd = cwd.slice(0, cwd.lastIndexOf('/')) || '/';
          else if (['/usr/share', '/usr/share/wordlists', '/usr/bin', '/root'].includes(argument)) cwd = argument;
          else if (['desktop', 'documents', 'downloads'].includes(argument.toLowerCase())) cwd = `/root/${argument[0].toUpperCase()}${argument.slice(1).toLowerCase()}`;
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
          write('Kali GNU/Linux 2.0 (Sana) · 2015\nroot@kali:~# Welcome to a browser-only retro terminal', 'terminal-banner');
        }
        write('Type HELP for available commands. Nothing here runs on your computer.');
      }
      input.focus({ preventScroll: true });
    });
  }

  createTerminal('cmd');
  createTerminal('kali');
})();
