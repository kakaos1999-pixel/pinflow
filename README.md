# PinFlow

Böngészős, **drag-and-drop kapcsolási-rajz (wiring) szerkesztő**. Raspberry Pi /
ESP32 / Arduino és szenzor-modulok húzhatók a vászonra **hiteles lábkiosztással**,
szabadon mozgathatók, és a lábak vezetékkel összeköthetők — könnyű Fritzing/Wokwi
jelleggel, kifejezetten bekötések megtervezéséhez.

Vite + React + TypeScript, tiszta SVG vászon, külső rajz-könyvtár nélkül.

## Funkciók

- **Komponens-paletta** — húzd a vászonra, vagy kattints rá a hozzáadáshoz.
- **Mozgatás, pan & zoom** — a komponensek szabadon mozgathatók; a háttér húzásával
  pásztázol, az egérgörgővel a kurzorra zoomolsz. Jobb-alsó vezérlők (−, 100%, +, illeszt).
- **Láb-láb vezetékek** — kattints egy lábra, majd egy másikra → vezeték húzódik köztük.
  A vezeték együtt mozog a komponensekkel, kijelölhető, **színezhető** és törölhető.
  A szín alapból a busz típusából adódik (táp=piros, föld=szürke, I2C=zöld, SPI=narancs,
  UART=lila, I2S=rózsaszín, PWM=sárga, analóg=cián).
- **Mentés / betöltés** — automatikus mentés `localStorage`-ba; JSON **export/import**
  fájlba; valamint **kép-export SVG-be, PNG-be és (vektoros) PDF-be**.
- **Undo** (Ctrl/Cmd+Z), **törlés** (Delete/Backspace), **mégse** (Esc).

## Kezdő komponens-készlet

| Komponens | Megjegyzés |
|---|---|
| Raspberry Pi 5 | 40 lábú GPIO fejléc (fizikai 1–40, páratlan bal / páros jobb) — a Pi 2/3/4-gyel azonos |
| ESP32 DevKit V1 (WROOM-32) | 30 lábú DOIT elrendezés; I2C: SDA=GPIO21, SCL=GPIO22; VSPI: 23/19/18/5 |
| Arduino Uno R3 | sematikus: bal = táp+analóg, jobb = digitális; I2C: A4/A5; SPI: D13/D12/D11/D10 |
| INMP441 | I2S MEMS mikrofon (SCK/WS/SD, L/R) |
| PCA9685 | 16 csatornás I2C PWM/szervó meghajtó (VCC, V+, SCL, SDA, OE) |
| MPU6050 | I2C IMU, 6 tengely (GY-521) |
| BNO055 | I2C/UART IMU, 9 tengely (Adafruit) |
| SHT3x | I2C hőmérséklet + páratartalom |

## Futtatás

```bash
npm install
npm run dev        # fejlesztői szerver: http://localhost:4190
```

További parancsok:

```bash
npm run build      # típusellenőrzés + produkciós build a dist/-be
npm run preview    # a buildelt verzió kiszolgálása
```

## Architektúra / adatmodell

A kód **tisztán szétválasztja** a definíciókat és az állapotot
(lásd [`src/types.ts`](src/types.ts)):

- **Definíciók** (`ComponentDef`) — a komponensek állandó leírása (méret, lábkiosztás).
  Ezek a [`src/data/components.ts`](src/data/components.ts) regiszterben élnek.
- **Állapot** (`Project`) — a lehelyezett példányok (`Instance[]`) és a lábakat
  összekötő vezetékek (`Wire[]`), láb-referenciákkal. Ez mentődik JSON-ba.

```
src/
  types.ts              # adatmodell (ComponentDef, Pin, Instance, Wire, Project)
  data/components.ts    # komponens-definíciós REGISZTER (ide kell új alkatrész)
  state/useEditor.ts    # központi állapot: projekt (undo), nézet, kijelölés, vezetékezés
  lib/
    geometry.ts         # láb-világkoordináta, busz-színek, vezeték-útvonal, befoglaló
    storage.ts          # localStorage + JSON export/import
    export.ts           # SVG + PNG kép-export
  components/
    Toolbar, Palette, Canvas, ComponentView, WireView, Inspector
```

### Új komponens hozzáadása

A komponens-definíciók könnyen bővíthetők. Egy láb a definícióban:

```ts
interface Pin {
  id: string;          // a definíción belül EGYEDI (a vezetékek erre hivatkoznak)
  name: string;        // a vásznon látszó felirat, pl. "GPIO2", "SDA"
  sub?: string;        // halvány másodlagos felirat (fizikai lábszám / alt. funkció)
  x: number;           // a komponens bal-felső sarkához képest, pixelben
  y: number;
  side?: "left" | "right";
  bus?: "power" | "gnd" | "gpio" | "i2c" | "spi" | "uart" | "i2s" | "pwm" | "analog" | "other";
}
```

A koordinátákat **nem kézzel** számoljuk: a `data/components.ts`-ben lévő
`twoCol(...)` (lábak a bal és jobb élen) és `oneCol(...)` (lábak a bal élen)
segédfüggvények a lábak sorrendjéből számítják a pozíciót és a doboz méretét.
Új alkatrészhez elég egy `PinSpec[]` tömb (id, name, sub?, bus?) és egy hívás,
majd betolni a `COMPONENTS` tömbbe. Példák magában a fájlban.

### Projekt-fájl (JSON) formátum

```json
{
  "version": 1,
  "name": "Robot bekötés",
  "instances": [
    { "id": "i_ab12cd3", "defId": "rpi5", "x": 120, "y": 80, "label": "Pi 5" }
  ],
  "wires": [
    {
      "id": "w_ef45gh6",
      "from": { "instanceId": "i_ab12cd3", "pinId": "3" },
      "to":   { "instanceId": "i_xy78zw9", "pinId": "GPIO21" },
      "color": "#22c55e"
    }
  ]
}
```

## Deploy

Vercelre telepíthető (Vite preset automatikusan felismeri): build parancs
`npm run build`, kimenet `dist/`.
