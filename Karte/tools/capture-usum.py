"""Rendert eine Gen-7-Feldszene mit USUMStudio und speichert den Viewport.

Aufruf: python capture-usum.py <usum-viewport.exe> <dump> <area> <ausgabe.png>
USUMStudio wird nur als dokumentierter Decoder/Renderer für die bereitgestellten
Spielarchive verwendet; dieses Skript automatisiert Kamera, Fokus und Aufnahme.
"""

import argparse
import ctypes
from ctypes import wintypes
import json
import os
import re
import subprocess
import threading
import time
from PIL import Image, ImageGrab


ap = argparse.ArgumentParser()
ap.add_argument('studio')
ap.add_argument('dump')
ap.add_argument('area', type=int)
ap.add_argument('output')
ap.add_argument('--timeout', type=float, default=45)
ap.add_argument('--full-window', action='store_true', help='Nicht auf den Karten-Viewport zuschneiden')
ap.add_argument('--screen-grab', action='store_true', help='Bildschirm statt direktem Fensterinhalt aufnehmen')
args = ap.parse_args()

user32 = ctypes.windll.user32
gdi32 = ctypes.windll.gdi32
SW_RESTORE = 9
SWP_SHOWWINDOW = 0x0040
VK_ESCAPE = 0x1B
KEYEVENTF_KEYUP = 0x0002
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004


class BITMAPINFOHEADER(ctypes.Structure):
    _fields_ = [
        ('biSize', wintypes.DWORD), ('biWidth', wintypes.LONG), ('biHeight', wintypes.LONG),
        ('biPlanes', wintypes.WORD), ('biBitCount', wintypes.WORD),
        ('biCompression', wintypes.DWORD), ('biSizeImage', wintypes.DWORD),
        ('biXPelsPerMeter', wintypes.LONG), ('biYPelsPerMeter', wintypes.LONG),
        ('biClrUsed', wintypes.DWORD), ('biClrImportant', wintypes.DWORD),
    ]


class BITMAPINFO(ctypes.Structure):
    _fields_ = [('bmiHeader', BITMAPINFOHEADER), ('bmiColors', wintypes.DWORD * 3)]


gdi32.CreateCompatibleDC.restype = wintypes.HDC
gdi32.CreateCompatibleDC.argtypes = [wintypes.HDC]
gdi32.CreateCompatibleBitmap.restype = wintypes.HBITMAP
gdi32.CreateCompatibleBitmap.argtypes = [wintypes.HDC, ctypes.c_int, ctypes.c_int]
gdi32.SelectObject.restype = wintypes.HGDIOBJ
gdi32.SelectObject.argtypes = [wintypes.HDC, wintypes.HGDIOBJ]
gdi32.GetDIBits.argtypes = [wintypes.HDC, wintypes.HBITMAP, wintypes.UINT, wintypes.UINT,
                            ctypes.c_void_p, ctypes.POINTER(BITMAPINFO), wintypes.UINT]
gdi32.DeleteObject.argtypes = [wintypes.HGDIOBJ]
gdi32.DeleteDC.argtypes = [wintypes.HDC]
user32.GetWindowDC.restype = wintypes.HDC
user32.GetWindowDC.argtypes = [wintypes.HWND]
user32.PrintWindow.argtypes = [wintypes.HWND, wintypes.HDC, wintypes.UINT]
user32.ReleaseDC.argtypes = [wintypes.HWND, wintypes.HDC]


def print_window(hwnd, width, height):
    """Liest genau dieses Fenster via PrintWindow, auch wenn es verdeckt ist."""
    window_dc = user32.GetWindowDC(hwnd)
    memory_dc = gdi32.CreateCompatibleDC(window_dc)
    bitmap = gdi32.CreateCompatibleBitmap(window_dc, width, height)
    old = gdi32.SelectObject(memory_dc, bitmap)
    try:
        if not user32.PrintWindow(hwnd, memory_dc, 2):  # PW_RENDERFULLCONTENT
            return None
        header = BITMAPINFOHEADER()
        header.biSize = ctypes.sizeof(BITMAPINFOHEADER)
        header.biWidth = width
        header.biHeight = -height  # top-down
        header.biPlanes = 1
        header.biBitCount = 32
        header.biCompression = 0  # BI_RGB
        info = BITMAPINFO(header, (wintypes.DWORD * 3)())
        pixels = ctypes.create_string_buffer(width * height * 4)
        if not gdi32.GetDIBits(memory_dc, bitmap, 0, height, pixels, ctypes.byref(info), 0):
            return None
        return Image.frombuffer('RGB', (width, height), pixels, 'raw', 'BGRX', 0, 1).copy()
    finally:
        gdi32.SelectObject(memory_dc, old)
        gdi32.DeleteObject(bitmap)
        gdi32.DeleteDC(memory_dc)
        user32.ReleaseDC(hwnd, window_dc)


def find_window(pid):
    found = []
    callback = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

    @callback
    def visit(hwnd, _):
        owner = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(owner))
        if owner.value == pid and user32.IsWindowVisible(hwnd):
            found.append(hwnd)
        return True

    user32.EnumWindows(visit, 0)
    return found[0] if found else None


lines = []
pref_dir = os.path.join(os.environ.get('APPDATA', ''), 'USUMStudio', 'USUMStudio')
pref_file = os.path.join(pref_dir, 'preferences.cfg')
old_preferences = None
if pref_dir:
    os.makedirs(pref_dir, exist_ok=True)
    if os.path.exists(pref_file):
        with open(pref_file, 'rb') as saved:
            old_preferences = saved.read()
    # Saubere Kartenaufnahme: Tutorials und unauflösbare Story-Platzierungen
    # ausblenden. Die normale Terrain-/Gebäude-Beleuchtung bleibt aktiv.
    with open(pref_file, 'w', encoding='utf-8', newline='\n') as saved:
        saved.write('tutorial_progress "TUTORIALS 1 0 1 \\"\\""\n')
        saved.write('tutorial_paused "1"\n')
        saved.write('characters_enabled "1"\n')
        saved.write('conditional_characters "0"\n')
        saved.write('particles_enabled "0"\n')
process = subprocess.Popen(
    [os.path.abspath(args.studio), '--dump', os.path.abspath(args.dump), '--area', str(args.area),
     '--animation-time', '0'],
    cwd=os.path.dirname(os.path.abspath(args.studio)),
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    encoding='utf-8',
    errors='replace',
)


def collect():
    if process.stdout:
        for line in process.stdout:
            lines.append(line.rstrip())


threading.Thread(target=collect, daemon=True).start()
deadline = time.time() + args.timeout
hwnd = None
bounds = None
try:
    while time.time() < deadline:
        if process.poll() is not None:
            raise RuntimeError('USUMStudio wurde vor dem Rendern beendet: ' + ' | '.join(lines[-8:]))
        hwnd = hwnd or find_window(process.pid)
        joined = '\n'.join(lines)
        match = re.search(r'Bounds:\s*([-+0-9.eE]+),([-+0-9.eE]+),([-+0-9.eE]+) to ([-+0-9.eE]+),([-+0-9.eE]+),([-+0-9.eE]+)', joined)
        if match:
            bounds = [float(value) for value in match.groups()]
            break
        time.sleep(.1)
    if not hwnd or not bounds:
        raise RuntimeError('USUMStudio-Render hat das Zeitlimit überschritten: ' + ' | '.join(lines[-8:]))

    screen_w, screen_h = user32.GetSystemMetrics(0), user32.GetSystemMetrics(1)
    width, height = min(1600, screen_w), min(1000, screen_h)
    # Ein eventuell offenes Startmenü schließen; es liegt selbst über
    # Topmost-Fenstern und würde sonst in einer Bildschirmaufnahme erscheinen.
    user32.keybd_event(VK_ESCAPE, 0, 0, 0)
    user32.keybd_event(VK_ESCAPE, 0, KEYEVENTF_KEYUP, 0)
    user32.ShowWindow(hwnd, SW_RESTORE)
    user32.SetWindowPos(hwnd, -1, 0, 0, width, height, SWP_SHOWWINDOW)
    user32.SetForegroundWindow(hwnd)
    time.sleep(1.5)

    time.sleep(1.0)
    if process.poll() is not None:
        raise RuntimeError('USUMStudio wurde beim Rendern beendet: ' + ' | '.join(lines[-8:]))

    rect = wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(rect))
    # Direkt vor dem Grab erneut nach vorn holen; so kann niemals ein dahinter
    # liegendes Nutzerfenster statt des Renderers im Atlas landen.
    user32.SetWindowPos(hwnd, -1, rect.left, rect.top, rect.right - rect.left,
                        rect.bottom - rect.top, SWP_SHOWWINDOW)
    user32.BringWindowToTop(hwnd)
    user32.SetForegroundWindow(hwnd)
    user32.SetCursorPos(rect.left + (rect.right - rect.left) // 2, rect.top + 16)
    user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
    user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
    time.sleep(.2)
    image = None if args.screen_grab else print_window(hwnd, rect.right - rect.left, rect.bottom - rect.top)
    if image is None and not args.screen_grab:
        raise RuntimeError('Direkte USUMStudio-Fensteraufnahme ist fehlgeschlagen')
    if args.screen_grab:
        image = ImageGrab.grab(bbox=(rect.left, rect.top, rect.right, rect.bottom), all_screens=True)
    if not args.full_window:
        # USUMStudio besitzt links den Szenenbaum und rechts den Inspector. Die
        # relativen Grenzen bleiben auch unter Windows-DPI-Skalierung stabil.
        left = round(image.width * .1895)
        top = round(image.height * .134)
        right = round(image.width * .7755)
        bottom = round(image.height * .950)
        image = image.crop((left, top, right, bottom))
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    image.save(args.output)
    print(json.dumps({'area': args.area, 'bounds': bounds, 'size': image.size, 'output': os.path.abspath(args.output)}))
finally:
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
    if pref_dir:
        if old_preferences is None:
            try:
                os.remove(pref_file)
            except FileNotFoundError:
                pass
        else:
            with open(pref_file, 'wb') as saved:
                saved.write(old_preferences)
