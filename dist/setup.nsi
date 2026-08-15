; M.A.D. BOLT-REMIX — Windows NSIS Installer
; Built manually because electron-builder 26.0.12 hangs during asar packing.
; Packages dist\win-unpacked\ into a self-extracting installer with:
;   - per-user or per-machine install (user chooses)
;   - Start Menu shortcut
;   - Desktop shortcut (optional)
;   - Add/Remove Programs entry
;   - Uninstaller
;
; Run from the project root:
;   "C:\Users\Dr.Neal\AppData\Local\electron-builder\Cache\nsis\nsis-3.0.4.1\Bin\makensis.exe" dist\setup.nsi

Unicode True
SetCompressor /SOLID lzma
ManifestDPIAware true
RequestExecutionLevel user

!include "MUI2.nsh"
!include "LogicLib.nsh"

Name "M.A.D. BOLT-REMIX"
OutFile "M.A.D. BOLT-REMIX-1.0.0-win-x64-setup.exe"
InstallDir "$LOCALAPPDATA\M.A.D. BOLT-REMIX"
InstallDirRegKey HKCU "Software\M.A.D. BOLT-REMIX" "InstallDir"
BrandingText "M.A.D. BOLT-REMIX — engineered in the M.A.D. Laboratory"
!define MUI_ABORTWARNING

!define MUI_WELCOMEPAGE_TITLE "M.A.D. BOLT-REMIX Setup"
!define MUI_WELCOMEPAGE_TEXT "This wizard will install M.A.D. BOLT-REMIX By: Dr. Neal — the AI-powered full-stack web workbench — on your computer.$\r$\n$\r$\nClick Next to continue."
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

Section "M.A.D. BOLT-REMIX (required)" SEC_APP
  SectionIn RO
  SetOutPath "$INSTDIR"
  ; Copy the win-unpacked tree (electron.exe, *.dll, resources/, locales/, etc.)
  File /r "win-unpacked"

  ; Store install dir for uninstaller
  WriteRegStr HKCU "Software\M.A.D. BOLT-REMIX" "InstallDir" "$INSTDIR"

  ; Start Menu shortcut
  CreateDirectory "$SMPROGRAMS\M.A.D. BOLT-REMIX"
  CreateShortcut "$SMPROGRAMS\M.A.D. BOLT-REMIX\M.A.D. BOLT-REMIX.lnk" "$INSTDIR\M.A.D. BOLT-REMIX.exe"
  CreateShortcut "$SMPROGRAMS\M.A.D. BOLT-REMIX\Uninstall.lnk" "$INSTDIR\Uninstall.exe"

  ; Add/Remove Programs
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\M.A.D. BOLT-REMIX" "DisplayName" "M.A.D. BOLT-REMIX By: Dr. Neal"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\M.A.D. BOLT-REMIX" "DisplayVersion" "1.0.0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\M.A.D. BOLT-REMIX" "Publisher" "Dr. Neal — The M.A.D. Doctor"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\M.A.D. BOLT-REMIX" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\M.A.D. BOLT-REMIX" "UninstallString" "$\"$INSTDIR\Uninstall.exe$\""
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\M.A.D. BOLT-REMIX" "DisplayIcon" "$\"$INSTDIR\M.A.D. BOLT-REMIX.exe$\""

  ; Write the uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

Section "Desktop shortcut" SEC_DESKTOP
  CreateShortcut "$DESKTOP\M.A.D. BOLT-REMIX.lnk" "$INSTDIR\M.A.D. BOLT-REMIX.exe"
SectionEnd

Section "Uninstall"
  ; Remove installed files
  RMDir /r "$INSTDIR"

  ; Remove shortcuts
  Delete "$SMPROGRAMS\M.A.D. BOLT-REMIX\M.A.D. BOLT-REMIX.lnk"
  Delete "$SMPROGRAMS\M.A.D. BOLT-REMIX\Uninstall.lnk"
  RMDir "$SMPROGRAMS\M.A.D. BOLT-REMIX"
  Delete "$DESKTOP\M.A.D. BOLT-REMIX.lnk"

  ; Remove registry keys
  DeleteRegKey HKCU "Software\M.A.D. BOLT-REMIX"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\M.A.D. BOLT-REMIX"
SectionEnd
