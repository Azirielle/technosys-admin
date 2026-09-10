import { execSync } from 'child_process';

if (process.platform === 'win32') {
  try {
    const currentPid = process.pid;
    const psScript = `$curr = ${currentPid}; Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.ProcessId -ne $curr -and ($_.CommandLine -match 'postcss|\\.next') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript}"`, { stdio: 'ignore' });
  } catch {
    // Ignore if no matching processes found
  }
}
