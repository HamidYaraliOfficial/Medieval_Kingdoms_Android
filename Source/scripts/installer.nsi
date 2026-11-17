; Iron Crown: Medieval Kingdoms - Windows installer (NSIS 3, MUI2)
; Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
; Compile with:  node scripts/installer.mjs      (passes SRCDIR, OUTFILE, ICON, LICENSEFILE, VERSION, SIZEKB)
Unicode True
SetCompressor /SOLID lzma
SetCompressorDictSize 32
RequestExecutionLevel admin
ManifestDPIAware true

!ifndef SRCDIR
  !error "Define SRCDIR (the packaged game folder containing Game.exe)"
!endif
!ifndef OUTFILE
  !define OUTFILE "GameSetup.exe"
!endif
!ifndef VERSION
  !define VERSION "1.0.0"
!endif
!ifndef SIZEKB
  !define SIZEKB 300000
!endif

!define APPNAME   "Iron Crown: Medieval Kingdoms"
!define FOLDER    "Iron Crown Medieval Kingdoms"
!define PUBLISHER "Hamid Yarali"
!define REGKEY    "Software\IronCrownMedievalKingdoms"
!define UNINSTKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\IronCrownMedievalKingdoms"
!define DATAFOLDER "IronCrown-MedievalKingdoms"

!include "MUI2.nsh"
!include "x64.nsh"
!include "LogicLib.nsh"

Name "${APPNAME}"
OutFile "${OUTFILE}"
BrandingText "Copyright (c) 2026 Hamid Yarali. All Rights Reserved."
InstallDir "$PROGRAMFILES64\${FOLDER}"
InstallDirRegKey HKLM "${REGKEY}" "InstallDir"
ShowInstDetails show
ShowUninstDetails show

!define MUI_ICON "${ICON}"
!define MUI_UNICON "${ICON}"
!define MUI_ABORTWARNING
!define MUI_COMPONENTSPAGE_SMALLDESC
!define MUI_LANGDLL_REGISTRY_ROOT HKLM
!define MUI_LANGDLL_REGISTRY_KEY "${REGKEY}"
!define MUI_LANGDLL_REGISTRY_VALUENAME "InstallerLanguage"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "${LICENSEFILE}"
!insertmacro MUI_PAGE_COMPONENTS
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE DirLeave
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_FUNCTION LaunchGame
!define MUI_FINISHPAGE_RUN_TEXT "$(T_RUN)"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Farsi"

LangString T_SEC_GAME    ${LANG_ENGLISH} "Iron Crown: Medieval Kingdoms (required)"
LangString T_SEC_DESK    ${LANG_ENGLISH} "Desktop shortcut"
LangString T_SEC_START   ${LANG_ENGLISH} "Start Menu shortcuts"
LangString T_DESC_GAME   ${LANG_ENGLISH} "The game and the files it needs."
LangString T_DESC_DESK   ${LANG_ENGLISH} "Create a shortcut to the game on the desktop."
LangString T_DESC_START  ${LANG_ENGLISH} "Create Start Menu shortcuts for the game and the uninstaller."
LangString T_RUN         ${LANG_ENGLISH} "Start Iron Crown: Medieval Kingdoms"
LangString T_NEED64      ${LANG_ENGLISH} "This game needs a 64-bit edition of Windows 10 or newer."
LangString T_KEEPSAVES   ${LANG_ENGLISH} "Also delete your saved games and settings?$\r$\n$\r$\nChoose No to keep them."
LangString T_UNSAFE      ${LANG_ENGLISH} "The uninstaller did not find the game in this folder, so no files were removed."
LangString T_UNINST_LINK ${LANG_ENGLISH} "Uninstall"

LangString T_SEC_GAME    ${LANG_FARSI} "Iron Crown: Medieval Kingdoms (ضروری)"
LangString T_SEC_DESK    ${LANG_FARSI} "میان‌بر روی دسکتاپ"
LangString T_SEC_START   ${LANG_FARSI} "میان‌بر در منوی Start"
LangString T_DESC_GAME   ${LANG_FARSI} "بازی و فایل‌های مورد نیاز آن."
LangString T_DESC_DESK   ${LANG_FARSI} "ساخت میان‌بر بازی روی دسکتاپ."
LangString T_DESC_START  ${LANG_FARSI} "ساخت میان‌بر بازی و حذف‌کننده در منوی Start."
LangString T_RUN         ${LANG_FARSI} "اجرای Iron Crown: Medieval Kingdoms"
LangString T_NEED64      ${LANG_FARSI} "این بازی به ویندوز ۶۴ بیتی (ویندوز ۱۰ یا جدیدتر) نیاز دارد."
LangString T_KEEPSAVES   ${LANG_FARSI} "ذخیره‌ها و تنظیمات بازی هم حذف شوند؟$\r$\n$\r$\nبرای نگه داشتن آن‌ها «خیر» را بزنید."
LangString T_UNSAFE      ${LANG_FARSI} "حذف‌کننده بازی را در این پوشه پیدا نکرد، پس هیچ فایلی پاک نشد."
LangString T_UNINST_LINK ${LANG_FARSI} "حذف بازی"

VIProductVersion "${VERSION}.0"
VIAddVersionKey /LANG=${LANG_ENGLISH} "ProductName"     "${APPNAME}"
VIAddVersionKey /LANG=${LANG_ENGLISH} "CompanyName"     "${PUBLISHER}"
VIAddVersionKey /LANG=${LANG_ENGLISH} "LegalCopyright"  "Copyright (c) 2026 Hamid Yarali. All Rights Reserved."
VIAddVersionKey /LANG=${LANG_ENGLISH} "FileDescription" "${APPNAME} Setup"
VIAddVersionKey /LANG=${LANG_ENGLISH} "FileVersion"     "${VERSION}"
VIAddVersionKey /LANG=${LANG_ENGLISH} "ProductVersion"  "${VERSION}"

; Always install into a folder that is ours, so uninstalling can never remove a shared folder
; (e.g. a user typing "C:\Program Files" or "D:\Games").
Function EnsureSubdir
  StrLen $1 "${FOLDER}"
  IntOp $2 0 - $1
  StrCpy $0 $INSTDIR "" $2
  ${If} $0 != "${FOLDER}"
    StrCpy $INSTDIR "$INSTDIR\${FOLDER}"
  ${EndIf}
FunctionEnd

Function DirLeave
  Call EnsureSubdir
FunctionEnd

Function LaunchGame
  ; start un-elevated through Explorer so the game does not run as administrator
  Exec '"$WINDIR\explorer.exe" "$INSTDIR\Game.exe"'
FunctionEnd

Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_OK|MB_ICONSTOP "$(T_NEED64)"
    Abort
  ${EndIf}
  SetRegView 64
  !insertmacro MUI_LANGDLL_DISPLAY
FunctionEnd

Section "$(T_SEC_GAME)" SecGame
  SectionIn RO
  SetRegView 64
  Call EnsureSubdir
  SetOutPath "$INSTDIR"
  File /r "${SRCDIR}/*"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "${REGKEY}" "InstallDir" "$INSTDIR"
  WriteRegStr HKLM "${UNINSTKEY}" "DisplayName" "${APPNAME}"
  WriteRegStr HKLM "${UNINSTKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKLM "${UNINSTKEY}" "Publisher" "${PUBLISHER}"
  WriteRegStr HKLM "${UNINSTKEY}" "DisplayIcon" "$INSTDIR\Game.exe"
  WriteRegStr HKLM "${UNINSTKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${UNINSTKEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKLM "${UNINSTKEY}" "QuietUninstallString" '"$INSTDIR\Uninstall.exe" /S'
  WriteRegStr HKLM "${UNINSTKEY}" "Comments" "Copyright (c) 2026 Hamid Yarali. All Rights Reserved."
  WriteRegDWORD HKLM "${UNINSTKEY}" "EstimatedSize" ${SIZEKB}
  WriteRegDWORD HKLM "${UNINSTKEY}" "NoModify" 1
  WriteRegDWORD HKLM "${UNINSTKEY}" "NoRepair" 1
SectionEnd

Section "$(T_SEC_DESK)" SecDesk
  SetShellVarContext all
  SetOutPath "$INSTDIR"
  CreateShortcut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\Game.exe" "" "$INSTDIR\Game.exe" 0
SectionEnd

Section "$(T_SEC_START)" SecStart
  SetShellVarContext all
  SetOutPath "$INSTDIR"
  CreateDirectory "$SMPROGRAMS\${APPNAME}"
  CreateShortcut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\Game.exe" "" "$INSTDIR\Game.exe" 0
  CreateShortcut "$SMPROGRAMS\${APPNAME}\$(T_UNINST_LINK).lnk" "$INSTDIR\Uninstall.exe"
SectionEnd

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecGame}  "$(T_DESC_GAME)"
  !insertmacro MUI_DESCRIPTION_TEXT ${SecDesk}  "$(T_DESC_DESK)"
  !insertmacro MUI_DESCRIPTION_TEXT ${SecStart} "$(T_DESC_START)"
!insertmacro MUI_FUNCTION_DESCRIPTION_END

Function un.onInit
  SetRegView 64
  !insertmacro MUI_UNGETLANGUAGE
FunctionEnd

Section "Uninstall"
  SetRegView 64
  SetShellVarContext all
  Delete "$DESKTOP\${APPNAME}.lnk"
  RMDir /r "$SMPROGRAMS\${APPNAME}"

  ; only remove the install folder when it is clearly ours
  StrLen $1 "${FOLDER}"
  IntOp $2 0 - $1
  StrCpy $0 $INSTDIR "" $2
  ${If} $0 == "${FOLDER}"
  ${AndIf} ${FileExists} "$INSTDIR\Game.exe"
    SetOutPath "$TEMP"
    RMDir /r "$INSTDIR"
  ${Else}
    Delete "$INSTDIR\Uninstall.exe"
    MessageBox MB_OK|MB_ICONEXCLAMATION "$(T_UNSAFE)"
  ${EndIf}

  DeleteRegKey HKLM "${UNINSTKEY}"
  DeleteRegKey HKLM "${REGKEY}"

  ${IfNot} ${Silent}
    MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "$(T_KEEPSAVES)" IDNO keepdata
    SetShellVarContext current
    RMDir /r "$APPDATA\${DATAFOLDER}"
    keepdata:
  ${EndIf}
SectionEnd
