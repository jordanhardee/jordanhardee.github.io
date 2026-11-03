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
    let mode = 'shell';
    let msfModule = '';
    let cwd = kind === 'cmd' ? 'C:\\Users\\Guest' : '/root';
    const kaliTools = [
      'aircrack-ng', 'airmon-ng', 'airodump-ng', 'arpspoof', 'burpsuite', 'crunch',
      'ettercap', 'hashcat', 'hydra', 'john', 'macchanger', 'maltego', 'msfconsole',
      'msfvenom', 'nc', 'netcat', 'nikto', 'nmap', 'reaver', 'searchsploit', 'sqlmap',
      'tcpdump', 'theharvester', 'wash', 'wireshark', 'wifite', 'wpscan', 'yersinia',
    ];
    const demoNotice = '[SIMULATION ONLY — no network traffic, files read, or programs executed]';
    const kaliBanner = [
      'Kali GNU/Linux 2.0 (Sana)  |  Debian 8 Jessie  |  August 2015',
      'Linux kali 4.0.0-kali1-amd64 x86_64',
      'Last login: Tue Aug 11 13:37:00 2015 from 192.0.2.1',
      'Welcome to the Kali training console. Type help to explore.',
      '── Browser-only simulation; nothing here connects to a machine. ──',
    ].join('\n');
    const toolVersions = {
      nmap: 'Nmap 6.49BETA4', msfconsole: 'Metasploit Framework 4.11.x',
      'aircrack-ng': 'Aircrack-ng 1.2 rc2', 'airmon-ng': 'airmon-ng 1.2 rc2',
      john: 'John the Ripper 1.8.0', hydra: 'THC-Hydra v8.1',
      sqlmap: 'sqlmap 1.0-dev', nikto: 'Nikto v2.1.6',
      wireshark: 'Wireshark 1.12.x', netcat: 'netcat-traditional 1.10',
      macchanger: 'GNU MAC Changer 1.7.0', searchsploit: 'Exploit-DB searchsploit (2015)',
    };
    const toolUsage = {
      nmap: 'Usage: nmap [Scan Type(s)] [Options] {target}\n-sS SYN scan  -sV Version detection  -O OS detection  -Pn No ping\nExample: nmap -sV 192.0.2.42',
      msfconsole: 'Usage: msfconsole [-q] [-h] [-v]\nLaunches a simulated msf > prompt. Type help after opening it.',
      'aircrack-ng': 'Usage: aircrack-ng [options] <capture.cap>\nExample: aircrack-ng demo-handshake.cap',
      'airmon-ng': 'Usage: airmon-ng [start|stop|check] [interface]\nExample: airmon-ng start wlan0',
      john: 'Usage: john [OPTIONS] [PASSWORD-FILES]\nExample: john demo-hashes.txt',
      hydra: 'Usage: hydra [[-l LOGIN|-L FILE] [-p PASS|-P FILE]] [OPTIONS] SERVER SERVICE\nExample: hydra -l admin -P demo.txt 192.0.2.42 ssh',
      sqlmap: 'Usage: sqlmap [options]\n-u URL  --batch  --dbs\nExample: sqlmap -u "http://training.example/?id=1" --batch',
      nikto: 'Usage: nikto -h <host> [options]\nExample: nikto -h 192.0.2.42',
      wireshark: 'Usage: wireshark [options] [capture-file]\nThis text-only browser mock cannot launch GTK or capture packets.',
      netcat: 'Usage: nc [-hlnruz] [-p source_port] [hostname] [port]\nExample: nc -v 192.0.2.42 80',
      macchanger: 'Usage: macchanger [options] device\n-r  random MAC   -s  show MAC   -m  set MAC\nExample: macchanger -r wlan0',
      searchsploit: 'Usage: searchsploit [options] term1 [term2] ...\nExample: searchsploit apache 2.4',
    };
    const toolDemos = {
      nmap: `Starting Nmap 6.49BETA4 ( https://nmap.org ) at 2015-08-11 13:37 UTC
Nmap scan report for training.example (192.0.2.42)
Host is up (0.0042s latency).
Not shown: 997 closed ports
PORT     STATE SERVICE VERSION
21/tcp   open  ftp     vsftpd 3.0.2
22/tcp   open  ssh     OpenSSH 6.7p1 Debian
80/tcp   open  http    Apache httpd 2.4.10
Nmap done: 1 IP address (1 host up) scanned in 1.37 seconds`,
      'aircrack-ng': `Aircrack-ng 1.2 rc2
[00:00:01] 1/1 keys tested (6.73 k/s)
Time left: 0 seconds                  100.00%
KEY FOUND! [ coffee-shop-demo ]
Master Key     : 00 11 22 33 44 55 66 77 (FAKE)
Test capture: demo-handshake.cap (imaginary)`,
      'airmon-ng': `Found 1 processes that could cause trouble.
PID  Name
1234 NetworkManager

PHY   Interface  Driver     Chipset
phy0  wlan0      ath9k_htc   Atheros AR9271
(mac80211 monitor mode enabled on wlan0mon) — simulated`,
      john: `John the Ripper 1.8.0-jumbo-1
Loaded 3 password hashes with 3 different salts (demo only)
Press 'q' or Ctrl-C to abort, almost any other key for status
hunter2          (demo-user)
1g 0:00:00:01 100.0% (2015-08-11 13:37) 1.000g/s
Session completed`,
      hydra: `Hydra v8.1 (c) 2015 by van Hauser/THC
[DATA] max 4 tasks per 1 server, overall 4 tasks, 8 login tries
[DATA] attacking ssh://192.0.2.42:22/
[22][ssh] host: 192.0.2.42   login: demo   password: letmein
1 of 1 target successfully completed, 1 valid password found (FAKE)`,
      sqlmap: `         ___
        __H__
  ___ ___[.]_____ ___ ___  {1.0-dev}
 |_ -| . [']     | .'| . |
 |___|_  [)]_|_|_|__,|  _|
       |_|V          |_|   https://sqlmap.org

[13:37:00] [INFO] testing connection to training.example
[13:37:01] [INFO] testing if GET parameter 'id' is dynamic
[13:37:01] [INFO] parameter 'id' appears to be injectable (DEMO)
[13:37:02] [INFO] backend DBMS: MySQL 5.5 (fictional)`,
      nikto: `- Nikto v2.1.6
---------------------------------------------------------------------------
+ Target IP:          192.0.2.42
+ Target Hostname:    training.example
+ Target Port:        80
+ Start Time:         2015-08-11 13:37:00 (UTC)
---------------------------------------------------------------------------
+ Server: Apache/2.4.10 (Debian)
+ /robots.txt: contains 2 entries
+ /icons/: directory indexing found (training fixture)
+ 1 host(s) tested — all findings invented`,
      wireshark: `Wireshark 1.12.x (GTK+)
Cannot open a graphical capture window from this simulated shell.

No. Time       Source       Destination   Protocol Info
  1 0.000000   192.0.2.10   192.0.2.42    TCP      51514 → 80 [SYN]
  2 0.003241   192.0.2.42   192.0.2.10    TCP      80 → 51514 [SYN, ACK]
  3 0.003445   192.0.2.10   192.0.2.42    TCP      51514 → 80 [ACK]
(These packets are text, not a captured network trace.)`,
      netcat: `netcat-traditional 1.10
(UNKNOWN) [192.0.2.42] 80 (http) open
HEAD / HTTP/1.0
HTTP/1.1 200 OK
Server: Apache/2.4.10 (Debian)
Content-Type: text/plain

You've reached a fictional machine.`,
      macchanger: `GNU MAC Changer 1.7.0
Current MAC:   02:00:00:00:00:01 (unknown)
Permanent MAC: 02:00:00:00:00:01 (unknown)
New MAC:       02:11:22:33:44:55 (randomized, FAKE)
No network interface was changed.`,
      searchsploit: `-------------------------------------------------------------- ---------------------------
 Exploit Title                                                | Path
-------------------------------------------------------------- ---------------------------
 Apache 2.4.x - Demo Directory Listing (training fixture)    | exploits/demo/apache.txt
 OpenSSH 6.x - Demo Authentication Test (training fixture)   | exploits/demo/openssh.txt
-------------------------------------------------------------- ---------------------------
2 fictional entries in an offline 2015-style index.`,
    };

    function write(message, className = '') {
      const line = document.createElement('p');
      line.textContent = message;
      if (className) line.className = className;
      output.append(line);
      while (output.children.length > 240) output.firstElementChild.remove();
      output.scrollTop = output.scrollHeight;
    }

    function updatePrompt() {
      prompt.textContent = kind === 'cmd' ? `${cwd}>`
        : mode === 'msf' ? `msf${msfModule ? ` exploit(${msfModule})` : ''} > `
          : `root@kali:${cwd === '/root' ? '~' : cwd}# `;
    }

    function showTool(name, argument) {
      const tool = name === 'nc' ? 'netcat' : name;
      if (/^(--help|-h)$/.test(argument)) {
        write(`${toolUsage[tool] || `Usage: ${tool} [options]`}\n${demoNotice}`);
        return;
      }
      if (/^(--version|-v|-V)$/.test(argument)) {
        write(`${toolVersions[tool] || `${tool} (Kali Sana-era demo)`}\n${demoNotice}`);
        return;
      }
      if (!argument && ['nmap', 'aircrack-ng', 'john', 'hydra', 'sqlmap', 'nikto', 'netcat', 'macchanger', 'searchsploit'].includes(tool)) {
        write(`${toolUsage[tool]}\n${demoNotice}`);
        return;
      }
      if (Object.prototype.hasOwnProperty.call(toolDemos, tool)) {
        write(`${toolDemos[tool]}\n${demoNotice}`, 'terminal-demo');
      } else {
        write(`${tool}: found in the vintage Kali tool menu. No program was launched.\n${demoNotice}`);
      }
    }

    function runMetasploit(command, argument) {
      switch (command) {
        case 'help': case '?':
          write('Metasploit Framework 4.11.x (2015 demo)\nCore Commands: help  banner  version  search  use  show options  set  back  exploit  clear  exit\nTry: search smb, use exploit/windows/smb/ms08_067_netapi, show options');
          break;
        case 'banner': case 'version':
          write('       =[ metasploit v4.11.x-dev (SIMULATED) ]\n+ -- --=[ 1,500+ exploits - 900+ auxiliary - 250+ post ]\nmsf >');
          break;
        case 'search':
          write(`Matching Modules (fictional local index for '${argument || 'all'}')\n   Name                                      Disclosure Date  Rank\n   exploit/windows/smb/ms08_067_netapi      2008-10-28       great\n   auxiliary/scanner/ssh/ssh_version        2009-01-01       normal\nNo lookup or network request was made.`);
          break;
        case 'use':
          if (!argument) { write('Usage: use <module>'); break; }
          msfModule = argument.split('/').pop().replace(/[^a-z0-9_-]/gi, '').slice(0, 40);
          updatePrompt();
          write(`[*] Using simulated module ${argument}.`);
          break;
        case 'show':
          write(argument === 'options'
            ? 'Module options (illustrative):\n   Name    Current Setting  Required  Description\n   RHOSTS  192.0.2.42       yes       Reserved demo target\n   RPORT   445              yes       SMB service port\nNo sockets are ever opened.'
            : 'Try: show options');
          break;
        case 'set': write(`[*] ${argument || 'RHOSTS 192.0.2.42'} (display only; no settings applied)`); break;
        case 'exploit': case 'run':
          write('[*] Started fictional module against documentation-only host 192.0.2.42\n[+] Meterpreter session 1 opened (IN YOUR IMAGINATION)\n[*] No payload generated, connection opened, or exploit executed.');
          break;
        case 'back': msfModule = ''; updatePrompt(); break;
        case 'clear': output.replaceChildren(); break;
        case 'exit': case 'quit': mode = 'shell'; msfModule = ''; updatePrompt(); write('Leaving the simulated Metasploit console.'); break;
        default: write(`Unknown msf command: ${command}. Type help.`, 'terminal-error');
      }
    }

    function runCommand(raw) {
      const line = raw.trim();
      const lower = line.toLowerCase();
      const [command] = lower.split(/\s+/);
      const argument = line.slice(command.length).trim();
      if (!line) return;
      write(`${prompt.textContent}${line}`, 'terminal-command');

      if (kind === 'kali' && mode === 'msf') {
        runMetasploit(command, argument);
        return;
      }

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
          write('Kali GNU/Linux 2.0 Sana · August 2015\n\nSHELL: help  ls  pwd  cd  clear  cat  uname -a  whoami  id  date  echo  history  ifconfig  iwconfig  netstat  dpkg\n\nSECURITY TOOLS:\n' + kaliTools.join('  ') + '\n\nTRY THESE:\n  nmap -sV 192.0.2.42      msfconsole\n  airmon-ng start wlan0     aircrack-ng demo.cap\n  john demo-hashes.txt      hydra -l demo -p demo 192.0.2.42 ssh\n  sqlmap -u training.example/?id=1\n  nikto -h 192.0.2.42      nc -v 192.0.2.42 80\n  macchanger -r wlan0      searchsploit apache\n  wireshark                 fortune\n\nType TOOL --help or TOOL --version. All responses are invented, local, and harmless.');
          break;
        case 'clear': output.replaceChildren(); break;
        case 'banner': write(kaliBanner, 'terminal-banner'); break;
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
        case 'history': write(history.map((entry, i) => `${String(i + 1).padStart(4)}  ${entry}`).join('\n')); break;
        case 'date': write(new Date().toString()); break;
        case 'echo': write(argument); break;
        case 'cat': write(lower === 'cat readme.txt' || lower === 'cat readme' ? 'Kali Linux 2.0 Sana (2015). This is a purely local browser terminal; no tools are actually installed or executed.' : `cat: ${argument || '(missing path)'}: No such file or directory`, lower.includes('readme') ? '' : 'terminal-error'); break;
        case 'ip': case 'ifconfig': write('eth0      Link encap:Ethernet  HWaddr 00:00:5e:00:53:01\n          inet addr:192.0.2.10  Bcast:192.0.2.255  Mask:255.255.255.0\nlo        Link encap:Local Loopback\n          inet addr:127.0.0.1  Mask:255.0.0.0\n[SIMULATED TEST-NET ADDRESS]'); break;
        case 'iwconfig': write('eth0      no wireless extensions.\nlo        no wireless extensions.\n[SIMULATED]'); break;
        case 'netstat': write('Active Internet connections (only servers)\nProto Recv-Q Send-Q Local Address   Foreign Address State\n[SIMULATED: no network access]'); break;
        case 'dpkg': write(argument === '-l' || argument === '--list' ? 'ii  aircrack-ng  1:1.2-0~rc2\nii  metasploit-framework  4.11\nii  nmap  6.49BETA4\nii  john  1.8.0\nii  sqlmap  1.0\n[FICTIONAL PACKAGE LIST]' : 'Try dpkg -l to see the simulated vintage tools.'); break;
        case 'msfconsole':
          if (/^(--help|-h|--version|-v)$/.test(argument)) { showTool(command, argument); break; }
          mode = 'msf';
          updatePrompt();
          write('       =[ metasploit v4.11.x-dev ]\n+ -- --=[ exploits  auxiliary  post  payloads  encoders ]\n\n[*] Metasploit initialized. All modules and sessions are fictional.\nType help or search smb.', 'terminal-banner');
          break;
        case 'nmap': case 'msfvenom': case 'aircrack-ng': case 'airmon-ng': case 'airodump-ng': case 'john': case 'hashcat': case 'hydra': case 'sqlmap': case 'nikto': case 'reaver': case 'wifite': case 'wireshark': case 'burpsuite': case 'ettercap': case 'tcpdump': case 'netcat': case 'nc': case 'macchanger': case 'searchsploit': case 'arpspoof': case 'crunch': case 'maltego': case 'theharvester': case 'wash': case 'wpscan': case 'yersinia':
          showTool(command, argument);
          break;
        case 'fortune': write('You are root. On an imaginary computer. The only thing getting exploited is nostalgia.'); break;
        case 'cowsay': write(` < ${argument || 'No packets were harmed in the making of this terminal.'} >\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||`); break;
        case 'sl': write('     ====        ________\n _D _|  |_______/        \\__I_I_____===__|\n(_____________________________)  Choo choo.'); break;
        case 'sudo': case 'ssh': case 'curl': case 'wget': case 'apt-get': case 'rm':
          write('Nice try. This is a 2015-looking browser toy, not a shell. No processes, files, or network activity were touched.'); break;
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
          write(kaliBanner, 'terminal-banner');
        }
        write('Type HELP for available commands. Nothing here runs on your computer.');
      }
      input.focus({ preventScroll: true });
    });
  }

  createTerminal('cmd');
  createTerminal('kali');
})();
