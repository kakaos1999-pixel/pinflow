// ====================================================================
// KOMPONENS-DEFINÍCIÓK REGISZTERE
// ====================================================================
//
// Minden komponens egy "dobozként" jelenik meg, a lábak a bal és/vagy
// jobb élen ülnek (függőleges oszlopok), hogy a feliratok vízszintesen
// olvashatóak maradjanak — ez a klasszikus kapcsolási-rajz (schematic)
// szimbólum-stílus.
//
// ÚJ KOMPONENS HOZZÁADÁSA:
//   1. Írj egy PinSpec[] tömböt a bal (és opcionálisan jobb) oszlopnak.
//      PinSpec = { id, name, sub?, bus? }
//        - id:   a definíción belül EGYEDI (vezetékek erre hivatkoznak)
//        - name: a vásznon látszó felirat
//        - sub:  halvány másodlagos felirat (pl. fizikai lábszám, alt. funkció)
//        - bus:  szín-kategória (lásd Bus típus) — csak segít a színezésben
//   2. Hívd a twoCol(...) vagy oneCol(...) segédet a méret+koordináták
//      kiszámításához, és told be a COMPONENTS tömbbe.
// A koordinátákat NEM kézzel számoljuk — a segédfüggvények adják.

import type { Bus, ComponentDef, Pin } from "../types";

// Elrendezési állandók (pixelben).
const PITCH = 22; // lábak függőleges távolsága
const TOP = 36; // hely a felső címke-sávnak
const BOT = 14; // alsó margó

interface PinSpec {
  id: string;
  name: string;
  sub?: string;
  bus?: Bus;
}

/** Egy függőleges láb-oszlopot helyez el a megadott x-en. */
function column(specs: PinSpec[], side: "left" | "right", x: number): Pin[] {
  return specs.map((s, i) => ({
    ...s,
    x,
    y: TOP + i * PITCH + PITCH / 2,
    side,
  }));
}

/** Kétoszlopos komponens (lábak a bal és jobb élen). */
function twoCol(
  base: Omit<ComponentDef, "pins" | "width" | "height">,
  left: PinSpec[],
  right: PinSpec[],
  width: number,
): ComponentDef {
  const n = Math.max(left.length, right.length);
  const height = TOP + n * PITCH + BOT;
  return {
    ...base,
    width,
    height,
    pins: [...column(left, "left", 0), ...column(right, "right", width)],
  };
}

/** Egyoszlopos komponens (lábak a bal élen). */
function oneCol(
  base: Omit<ComponentDef, "pins" | "width" | "height">,
  left: PinSpec[],
  width: number,
): ComponentDef {
  const height = TOP + left.length * PITCH + BOT;
  return { ...base, width, height, pins: column(left, "left", 0) };
}

// --------------------------------------------------------------------
// Raspberry Pi 5 — 40 lábú GPIO fejléc (ugyanaz, mint Pi 2/3/4)
// Páratlan fizikai lábak a bal oszlopban, párosak a jobb oszlopban.
// --------------------------------------------------------------------
const RPI5_ODD: PinSpec[] = [
  { id: "1", name: "3V3", sub: "#1", bus: "power" },
  { id: "3", name: "GPIO2", sub: "#3 · SDA1", bus: "i2c" },
  { id: "5", name: "GPIO3", sub: "#5 · SCL1", bus: "i2c" },
  { id: "7", name: "GPIO4", sub: "#7 · GPCLK0", bus: "gpio" },
  { id: "9", name: "GND", sub: "#9", bus: "gnd" },
  { id: "11", name: "GPIO17", sub: "#11", bus: "gpio" },
  { id: "13", name: "GPIO27", sub: "#13", bus: "gpio" },
  { id: "15", name: "GPIO22", sub: "#15", bus: "gpio" },
  { id: "17", name: "3V3", sub: "#17", bus: "power" },
  { id: "19", name: "GPIO10", sub: "#19 · MOSI", bus: "spi" },
  { id: "21", name: "GPIO9", sub: "#21 · MISO", bus: "spi" },
  { id: "23", name: "GPIO11", sub: "#23 · SCLK", bus: "spi" },
  { id: "25", name: "GND", sub: "#25", bus: "gnd" },
  { id: "27", name: "GPIO0", sub: "#27 · ID_SD", bus: "other" },
  { id: "29", name: "GPIO5", sub: "#29", bus: "gpio" },
  { id: "31", name: "GPIO6", sub: "#31", bus: "gpio" },
  { id: "33", name: "GPIO13", sub: "#33 · PWM1", bus: "pwm" },
  { id: "35", name: "GPIO19", sub: "#35 · PCM_FS", bus: "i2s" },
  { id: "37", name: "GPIO26", sub: "#37", bus: "gpio" },
  { id: "39", name: "GND", sub: "#39", bus: "gnd" },
];
const RPI5_EVEN: PinSpec[] = [
  { id: "2", name: "5V", sub: "#2", bus: "power" },
  { id: "4", name: "5V", sub: "#4", bus: "power" },
  { id: "6", name: "GND", sub: "#6", bus: "gnd" },
  { id: "8", name: "GPIO14", sub: "#8 · TXD", bus: "uart" },
  { id: "10", name: "GPIO15", sub: "#10 · RXD", bus: "uart" },
  { id: "12", name: "GPIO18", sub: "#12 · PCM_CLK", bus: "i2s" },
  { id: "14", name: "GND", sub: "#14", bus: "gnd" },
  { id: "16", name: "GPIO23", sub: "#16", bus: "gpio" },
  { id: "18", name: "GPIO24", sub: "#18", bus: "gpio" },
  { id: "20", name: "GND", sub: "#20", bus: "gnd" },
  { id: "22", name: "GPIO25", sub: "#22", bus: "gpio" },
  { id: "24", name: "GPIO8", sub: "#24 · CE0", bus: "spi" },
  { id: "26", name: "GPIO7", sub: "#26 · CE1", bus: "spi" },
  { id: "28", name: "GPIO1", sub: "#28 · ID_SC", bus: "other" },
  { id: "30", name: "GND", sub: "#30", bus: "gnd" },
  { id: "32", name: "GPIO12", sub: "#32 · PWM0", bus: "pwm" },
  { id: "34", name: "GND", sub: "#34", bus: "gnd" },
  { id: "36", name: "GPIO16", sub: "#36", bus: "gpio" },
  { id: "38", name: "GPIO20", sub: "#38 · PCM_DIN", bus: "i2s" },
  { id: "40", name: "GPIO21", sub: "#40 · PCM_DOUT", bus: "i2s" },
];

// --------------------------------------------------------------------
// ESP32 DevKit V1 (WROOM-32), 30 lábú DOIT elrendezés
// --------------------------------------------------------------------
const ESP32_LEFT: PinSpec[] = [
  { id: "EN", name: "EN", sub: "RST", bus: "other" },
  { id: "GPIO36", name: "GPIO36", sub: "VP · ADC1_0", bus: "analog" },
  { id: "GPIO39", name: "GPIO39", sub: "VN · ADC1_3", bus: "analog" },
  { id: "GPIO34", name: "GPIO34", sub: "ADC1_6 · in", bus: "analog" },
  { id: "GPIO35", name: "GPIO35", sub: "ADC1_7 · in", bus: "analog" },
  { id: "GPIO32", name: "GPIO32", sub: "ADC1_4", bus: "gpio" },
  { id: "GPIO33", name: "GPIO33", sub: "ADC1_5", bus: "gpio" },
  { id: "GPIO25", name: "GPIO25", sub: "DAC1", bus: "gpio" },
  { id: "GPIO26", name: "GPIO26", sub: "DAC2", bus: "gpio" },
  { id: "GPIO27", name: "GPIO27", bus: "gpio" },
  { id: "GPIO14", name: "GPIO14", sub: "HSPI_CLK", bus: "gpio" },
  { id: "GPIO12", name: "GPIO12", sub: "HSPI_MISO", bus: "gpio" },
  { id: "GND_L", name: "GND", bus: "gnd" },
  { id: "GPIO13", name: "GPIO13", sub: "HSPI_MOSI", bus: "gpio" },
  { id: "VIN", name: "VIN", sub: "5V", bus: "power" },
];
const ESP32_RIGHT: PinSpec[] = [
  { id: "GPIO23", name: "GPIO23", sub: "VSPI_MOSI", bus: "spi" },
  { id: "GPIO22", name: "GPIO22", sub: "SCL", bus: "i2c" },
  { id: "GPIO1", name: "GPIO1", sub: "TX0", bus: "uart" },
  { id: "GPIO3", name: "GPIO3", sub: "RX0", bus: "uart" },
  { id: "GPIO21", name: "GPIO21", sub: "SDA", bus: "i2c" },
  { id: "GPIO19", name: "GPIO19", sub: "VSPI_MISO", bus: "spi" },
  { id: "GPIO18", name: "GPIO18", sub: "VSPI_SCK", bus: "spi" },
  { id: "GPIO5", name: "GPIO5", sub: "VSPI_CS", bus: "spi" },
  { id: "GPIO17", name: "GPIO17", sub: "TX2", bus: "uart" },
  { id: "GPIO16", name: "GPIO16", sub: "RX2", bus: "uart" },
  { id: "GPIO4", name: "GPIO4", bus: "gpio" },
  { id: "GPIO0", name: "GPIO0", sub: "BOOT", bus: "other" },
  { id: "GPIO2", name: "GPIO2", bus: "gpio" },
  { id: "GPIO15", name: "GPIO15", bus: "gpio" },
  { id: "3V3", name: "3V3", bus: "power" },
];

// --------------------------------------------------------------------
// Arduino Uno R3 — bal oszlop: táp + analóg, jobb oszlop: digitális
// (sematikus elrendezés; a jelnevek a hiteles lábkiosztást követik)
// --------------------------------------------------------------------
const UNO_LEFT: PinSpec[] = [
  { id: "NC", name: "N/C", bus: "other" },
  { id: "IOREF", name: "IOREF", bus: "other" },
  { id: "RESET", name: "RESET", bus: "other" },
  { id: "3V3", name: "3V3", bus: "power" },
  { id: "5V", name: "5V", bus: "power" },
  { id: "GND1", name: "GND", bus: "gnd" },
  { id: "GND2", name: "GND", bus: "gnd" },
  { id: "VIN", name: "VIN", bus: "power" },
  { id: "A0", name: "A0", bus: "analog" },
  { id: "A1", name: "A1", bus: "analog" },
  { id: "A2", name: "A2", bus: "analog" },
  { id: "A3", name: "A3", bus: "analog" },
  { id: "A4", name: "A4", sub: "SDA", bus: "i2c" },
  { id: "A5", name: "A5", sub: "SCL", bus: "i2c" },
];
const UNO_RIGHT: PinSpec[] = [
  { id: "SCL", name: "SCL", bus: "i2c" },
  { id: "SDA", name: "SDA", bus: "i2c" },
  { id: "AREF", name: "AREF", bus: "other" },
  { id: "GND3", name: "GND", bus: "gnd" },
  { id: "D13", name: "D13", sub: "SCK", bus: "spi" },
  { id: "D12", name: "D12", sub: "MISO", bus: "spi" },
  { id: "D11", name: "D11", sub: "~ · MOSI", bus: "spi" },
  { id: "D10", name: "D10", sub: "~ · SS", bus: "pwm" },
  { id: "D9", name: "D9", sub: "~", bus: "pwm" },
  { id: "D8", name: "D8", bus: "gpio" },
  { id: "D7", name: "D7", bus: "gpio" },
  { id: "D6", name: "D6", sub: "~", bus: "pwm" },
  { id: "D5", name: "D5", sub: "~", bus: "pwm" },
  { id: "D4", name: "D4", bus: "gpio" },
  { id: "D3", name: "D3", sub: "~", bus: "pwm" },
  { id: "D2", name: "D2", bus: "gpio" },
  { id: "D1", name: "D1", sub: "TX", bus: "uart" },
  { id: "D0", name: "D0", sub: "RX", bus: "uart" },
];

// --------------------------------------------------------------------
// Modulok
// --------------------------------------------------------------------
const INMP441: PinSpec[] = [
  { id: "VDD", name: "VDD", sub: "3V3", bus: "power" },
  { id: "GND", name: "GND", bus: "gnd" },
  { id: "SD", name: "SD", sub: "adat ki", bus: "i2s" },
  { id: "WS", name: "WS", sub: "LRCL", bus: "i2s" },
  { id: "SCK", name: "SCK", sub: "BCLK", bus: "i2s" },
  { id: "LR", name: "L/R", sub: "csatorna", bus: "other" },
];

const PCA9685: PinSpec[] = [
  { id: "GND", name: "GND", bus: "gnd" },
  { id: "OE", name: "OE", sub: "kimenet eng.", bus: "other" },
  { id: "SCL", name: "SCL", bus: "i2c" },
  { id: "SDA", name: "SDA", bus: "i2c" },
  { id: "VCC", name: "VCC", sub: "logika 3V3/5V", bus: "power" },
  { id: "V+", name: "V+", sub: "szervó táp", bus: "power" },
];
const PCA9685_R: PinSpec[] = [
  { id: "CH0", name: "CH0", sub: "PWM", bus: "pwm" },
  { id: "CH1", name: "CH1", sub: "PWM", bus: "pwm" },
  { id: "CH2", name: "CH2", sub: "PWM", bus: "pwm" },
  { id: "CH3", name: "CH3", sub: "PWM", bus: "pwm" },
  { id: "CH14", name: "CH14", sub: "PWM", bus: "pwm" },
  { id: "CH15", name: "CH15", sub: "PWM", bus: "pwm" },
];

const MPU6050: PinSpec[] = [
  { id: "VCC", name: "VCC", sub: "3V3/5V", bus: "power" },
  { id: "GND", name: "GND", bus: "gnd" },
  { id: "SCL", name: "SCL", bus: "i2c" },
  { id: "SDA", name: "SDA", bus: "i2c" },
  { id: "XDA", name: "XDA", sub: "aux I2C", bus: "i2c" },
  { id: "XCL", name: "XCL", sub: "aux I2C", bus: "i2c" },
  { id: "AD0", name: "AD0", sub: "cím bit", bus: "other" },
  { id: "INT", name: "INT", bus: "other" },
];

const BNO055: PinSpec[] = [
  { id: "VIN", name: "VIN", sub: "3-5V", bus: "power" },
  { id: "3VO", name: "3Vo", sub: "3V3 ki", bus: "power" },
  { id: "GND", name: "GND", bus: "gnd" },
  { id: "SDA", name: "SDA", bus: "i2c" },
  { id: "SCL", name: "SCL", bus: "i2c" },
  { id: "RST", name: "RST", bus: "other" },
  { id: "INT", name: "INT", bus: "other" },
  { id: "ADR", name: "ADR", sub: "cím bit", bus: "other" },
  { id: "PS0", name: "PS0", sub: "mód", bus: "other" },
  { id: "PS1", name: "PS1", sub: "mód", bus: "other" },
];

const SHT3X: PinSpec[] = [
  { id: "VIN", name: "VIN", sub: "3-5V", bus: "power" },
  { id: "GND", name: "GND", bus: "gnd" },
  { id: "SCL", name: "SCL", bus: "i2c" },
  { id: "SDA", name: "SDA", bus: "i2c" },
  { id: "ADR", name: "ADR", sub: "cím bit", bus: "other" },
  { id: "ALERT", name: "ALERT", bus: "other" },
];

// ====================================================================
// A REGISZTER
// ====================================================================
export const COMPONENTS: ComponentDef[] = [
  twoCol(
    {
      id: "rpi5",
      name: "Raspberry Pi 5",
      category: "SBC",
      color: "#a3123a",
      note: "40 lábú GPIO fejléc (fizikai 1–40, páratlan bal / páros jobb). Megegyezik a Pi 2/3/4 kiosztással.",
    },
    RPI5_ODD,
    RPI5_EVEN,
    168,
  ),
  twoCol(
    {
      id: "esp32-devkit",
      name: "ESP32 DevKit V1",
      category: "MCU",
      color: "#1f6feb",
      note: "WROOM-32, 30 lábú DOIT elrendezés. Alap I2C: SDA=GPIO21, SCL=GPIO22. VSPI: 23/19/18/5.",
    },
    ESP32_LEFT,
    ESP32_RIGHT,
    172,
  ),
  twoCol(
    {
      id: "arduino-uno",
      name: "Arduino Uno R3",
      category: "MCU",
      color: "#00979d",
      note: "Sematikus elrendezés: bal = táp+analóg, jobb = digitális. I2C: A4=SDA, A5=SCL. SPI: D13/D12/D11/D10.",
    },
    UNO_LEFT,
    UNO_RIGHT,
    150,
  ),
  oneCol(
    {
      id: "inmp441",
      name: "INMP441",
      category: "I2S mikrofon",
      color: "#8957e5",
      note: "I2S MEMS mikrofon. Pi-hez: SCK→GPIO18, WS→GPIO19, SD→GPIO20, L/R→GND (bal csatorna).",
    },
    INMP441,
    124,
  ),
  twoCol(
    {
      id: "pca9685",
      name: "PCA9685",
      category: "PWM meghajtó",
      color: "#bf8700",
      note: "16 csatornás 12-bites I2C PWM/szervó meghajtó. V+ a szervók külön tápja. CH0–CH15 kimenetek (itt csak minta).",
    },
    PCA9685,
    PCA9685_R,
    150,
  ),
  oneCol(
    {
      id: "mpu6050",
      name: "MPU6050",
      category: "I2C IMU (6 t.)",
      color: "#2da44e",
      note: "GY-521 gyorsulás+giroszkóp. Alap cím 0x68 (AD0=GND), 0x69 (AD0=3V3).",
    },
    MPU6050,
    132,
  ),
  oneCol(
    {
      id: "bno055",
      name: "BNO055",
      category: "I2C IMU (9 t.)",
      color: "#2da44e",
      note: "Adafruit 9-tengelyű abszolút orientáció. Alap cím 0x28 (ADR=GND), 0x29 (ADR=3V3).",
    },
    BNO055,
    132,
  ),
  oneCol(
    {
      id: "sht3x",
      name: "SHT3x",
      category: "I2C hő/pára",
      color: "#1a7f9c",
      note: "Hőmérséklet + páratartalom. Alap cím 0x44 (ADR=GND), 0x45 (ADR=3V3).",
    },
    SHT3X,
    128,
  ),
];

/** defId → ComponentDef gyors kikeresés. */
export const COMPONENT_MAP: Record<string, ComponentDef> = Object.fromEntries(
  COMPONENTS.map((c) => [c.id, c]),
);

export function getDef(defId: string): ComponentDef | undefined {
  return COMPONENT_MAP[defId];
}
