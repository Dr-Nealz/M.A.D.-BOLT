# Reads the GitHub PAT from Windows Credential Manager and prints it to stdout.
# Hardcoded target — no user input interpolated.
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class CredMan {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public uint Flags; public uint Type; public IntPtr TargetName; public IntPtr Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public uint CredentialBlobSize; public IntPtr CredentialBlob; public uint Persist;
        public uint AttributeCount; public IntPtr Attributes; public IntPtr TargetAlias; public IntPtr UserName;
    }
    [DllImport("advapi32.dll", SetLastError=true, CharSet=CharSet.Unicode)]
    public static extern bool CredRead(string target, uint type, int flags, out IntPtr credential);
    [DllImport("advapi32.dll")]
    public static extern void CredFree(IntPtr cred);
}
'@

$p = [IntPtr]::Zero
$ok = [CredMan]::CredRead('git:https://github.com', 1, 0, [ref]$p)
if (-not $ok -or $p -eq [IntPtr]::Zero) {
    [Console]::Error.WriteLine('CredRead failed')
    exit 1
}
try {
    $c = [Runtime.InteropServices.Marshal]::PtrToStructure($p, [type][CredMan+CREDENTIAL])
    $b = New-Object byte[] $c.CredentialBlobSize
    [Runtime.InteropServices.Marshal]::Copy($c.CredentialBlob, $b, 0, $b.Length)
    $nulCount = ($b | Where-Object { $_ -eq 0 }).Count
    $enc = if ($nulCount -gt ($b.Length / 3)) { [System.Text.Encoding]::Unicode } else { [System.Text.Encoding]::UTF8 }
    Write-Output $enc.GetString($b).Trim([char]0).Trim()
} finally {
    [CredMan]::CredFree($p) | Out-Null
}
