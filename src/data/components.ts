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
  { id: "CH4", name: "CH4", sub: "PWM", bus: "pwm" },
  { id: "CH5", name: "CH5", sub: "PWM", bus: "pwm" },
  { id: "CH6", name: "CH6", sub: "PWM", bus: "pwm" },
  { id: "CH7", name: "CH7", sub: "PWM", bus: "pwm" },
  { id: "CH8", name: "CH8", sub: "PWM", bus: "pwm" },
  { id: "CH9", name: "CH9", sub: "PWM", bus: "pwm" },
  { id: "CH10", name: "CH10", sub: "PWM", bus: "pwm" },
  { id: "CH11", name: "CH11", sub: "PWM", bus: "pwm" },
  { id: "CH12", name: "CH12", sub: "PWM", bus: "pwm" },
  { id: "CH13", name: "CH13", sub: "PWM", bus: "pwm" },
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

const BME280: PinSpec[] = [
  { id: "VIN", name: "VIN", sub: "3-5V", bus: "power" },
  { id: "GND", name: "GND", bus: "gnd" },
  { id: "SCL", name: "SCL", sub: "SPI SCK", bus: "i2c" },
  { id: "SDA", name: "SDA", sub: "SPI MOSI", bus: "i2c" },
  { id: "CSB", name: "CSB", sub: "SPI CS", bus: "spi" },
  { id: "SDO", name: "SDO", sub: "SPI MISO / cím", bus: "spi" },
];

const SSD1306: PinSpec[] = [
  { id: "GND", name: "GND", bus: "gnd" },
  { id: "VCC", name: "VCC", sub: "3-5V", bus: "power" },
  { id: "SCL", name: "SCL", bus: "i2c" },
  { id: "SDA", name: "SDA", bus: "i2c" },
];

const HCSR04: PinSpec[] = [
  { id: "VCC", name: "VCC", sub: "5V", bus: "power" },
  { id: "TRIG", name: "TRIG", sub: "kimenet", bus: "gpio" },
  { id: "ECHO", name: "ECHO", sub: "bemenet · 5V!", bus: "gpio" },
  { id: "GND", name: "GND", bus: "gnd" },
];

const DHT22: PinSpec[] = [
  { id: "VCC", name: "VCC", sub: "3-5V", bus: "power" },
  { id: "DATA", name: "DATA", sub: "1-wire · pull-up", bus: "gpio" },
  { id: "GND", name: "GND", bus: "gnd" },
];

const DS18B20: PinSpec[] = [
  { id: "VDD", name: "VDD", sub: "3-5V", bus: "power" },
  { id: "DQ", name: "DQ", sub: "1-wire · 4k7 pull-up", bus: "gpio" },
  { id: "GND", name: "GND", bus: "gnd" },
];

const WS2812: PinSpec[] = [
  { id: "5V", name: "5V", sub: "táp (VIN)", bus: "power" },
  { id: "DIN", name: "DIN", sub: "adat be", bus: "gpio" },
  { id: "GND", name: "GND", bus: "gnd" },
];
const WS2812_R: PinSpec[] = [
  { id: "5VO", name: "5V", sub: "táp ki", bus: "power" },
  { id: "DOUT", name: "DOUT", sub: "adat ki", bus: "gpio" },
  { id: "GNDO", name: "GND", bus: "gnd" },
];

const MICROSD: PinSpec[] = [
  { id: "VCC", name: "VCC", sub: "3-5V", bus: "power" },
  { id: "GND", name: "GND", bus: "gnd" },
  { id: "MISO", name: "MISO", bus: "spi" },
  { id: "MOSI", name: "MOSI", bus: "spi" },
  { id: "SCK", name: "SCK", bus: "spi" },
  { id: "CS", name: "CS", bus: "spi" },
];

const LLC_LV: PinSpec[] = [
  { id: "LV", name: "LV", sub: "logika 3V3", bus: "power" },
  { id: "LGND", name: "GND", bus: "gnd" },
  { id: "LV1", name: "LV1", bus: "gpio" },
  { id: "LV2", name: "LV2", bus: "gpio" },
  { id: "LV3", name: "LV3", bus: "gpio" },
  { id: "LV4", name: "LV4", bus: "gpio" },
];
const LLC_HV: PinSpec[] = [
  { id: "HV", name: "HV", sub: "logika 5V", bus: "power" },
  { id: "HGND", name: "GND", bus: "gnd" },
  { id: "HV1", name: "HV1", bus: "gpio" },
  { id: "HV2", name: "HV2", bus: "gpio" },
  { id: "HV3", name: "HV3", bus: "gpio" },
  { id: "HV4", name: "HV4", bus: "gpio" },
];

const L298N: PinSpec[] = [
  { id: "VMS", name: "+12V", sub: "motor táp", bus: "power" },
  { id: "GND", name: "GND", bus: "gnd" },
  { id: "5V", name: "+5V", sub: "logika", bus: "power" },
  { id: "ENA", name: "ENA", sub: "PWM A", bus: "pwm" },
  { id: "IN1", name: "IN1", bus: "gpio" },
  { id: "IN2", name: "IN2", bus: "gpio" },
  { id: "IN3", name: "IN3", bus: "gpio" },
  { id: "IN4", name: "IN4", bus: "gpio" },
  { id: "ENB", name: "ENB", sub: "PWM B", bus: "pwm" },
];
const L298N_R: PinSpec[] = [
  { id: "OUT1", name: "OUT1", sub: "A motor", bus: "other" },
  { id: "OUT2", name: "OUT2", sub: "A motor", bus: "other" },
  { id: "OUT3", name: "OUT3", sub: "B motor", bus: "other" },
  { id: "OUT4", name: "OUT4", sub: "B motor", bus: "other" },
];

const RELAY: PinSpec[] = [
  { id: "VCC", name: "VCC", sub: "5V", bus: "power" },
  { id: "GND", name: "GND", bus: "gnd" },
  { id: "IN", name: "IN", sub: "vezérlés", bus: "gpio" },
];
const RELAY_R: PinSpec[] = [
  { id: "COM", name: "COM", sub: "közös", bus: "other" },
  { id: "NO", name: "NO", sub: "alapból nyitott", bus: "other" },
  { id: "NC", name: "NC", sub: "alapból zárt", bus: "other" },
];

const SERVO: PinSpec[] = [
  { id: "VCC", name: "V+", sub: "4.8-6V", bus: "power" },
  { id: "GND", name: "GND", bus: "gnd" },
  { id: "SIG", name: "SIG", sub: "PWM jel", bus: "pwm" },
];

// --- Táp / töltés / sínek (Gyula / SPIDER_BOT bővítés) ---------------
const LIPO3S: PinSpec[] = [
  { id: "P+", name: "+", sub: "12.6V", bus: "power" },
  { id: "P-", name: "−", bus: "gnd" },
  { id: "BAL", name: "balansz", sub: "B1·B2·B3", bus: "power" },
];
const BMS_L: PinSpec[] = [
  { id: "B-", name: "B−", sub: "pakk −", bus: "gnd" },
  { id: "B1", name: "B1", sub: "cella 1", bus: "power" },
  { id: "B2", name: "B2", sub: "cella 2", bus: "power" },
  { id: "B+", name: "B+", sub: "pakk +", bus: "power" },
];
const BMS_R: PinSpec[] = [
  { id: "P+", name: "P+", sub: "véd. ki +", bus: "power" },
  { id: "P-", name: "P−", sub: "véd. ki −", bus: "gnd" },
];
const IP2368_L: PinSpec[] = [
  { id: "USBC", name: "USB-C", sub: "PD be", bus: "power" },
  { id: "DCIN", name: "DC be", sub: "Qi 12V", bus: "power" },
  { id: "GIN", name: "GND", bus: "gnd" },
];
const IP2368_R: PinSpec[] = [
  { id: "BAT", name: "BAT", sub: "3S pakk +", bus: "power" },
  { id: "BGND", name: "GND", bus: "gnd" },
  { id: "STAT", name: "STAT", sub: "töltés-jel", bus: "other" },
];
const BUCK_L: PinSpec[] = [
  { id: "IN+", name: "IN+", bus: "power" },
  { id: "IN-", name: "IN−", bus: "gnd" },
];
const BUCK_R: PinSpec[] = [
  { id: "OUT+", name: "OUT+", bus: "power" },
  { id: "OUT-", name: "OUT−", bus: "gnd" },
];
// Gyula tápvédelem: fő-biztosíték, főkapcsoló, bulk kondi.
const FUSE: PinSpec[] = [
  { id: "IN", name: "IN", sub: "pakk +", bus: "power" },
  { id: "OUT", name: "OUT", sub: "→ kapcsoló", bus: "power" },
];
const SWITCH_PIN: PinSpec[] = [
  { id: "IN", name: "IN", sub: "biztosíték", bus: "power" },
  { id: "OUT", name: "OUT", sub: "→ buckok", bus: "power" },
];
const CAP: PinSpec[] = [
  { id: "+", name: "+", sub: "6V", bus: "power" },
  { id: "-", name: "−", bus: "gnd" },
];
const MAX98357: PinSpec[] = [
  { id: "VIN", name: "VIN", sub: "5V", bus: "power" },
  { id: "GND", name: "GND", bus: "gnd" },
  { id: "DIN", name: "DIN", sub: "I2S adat", bus: "i2s" },
  { id: "BCLK", name: "BCLK", bus: "i2s" },
  { id: "LRC", name: "LRC", sub: "WS", bus: "i2s" },
  { id: "GAIN", name: "GAIN", bus: "other" },
  { id: "SD", name: "SD", sub: "mód/shutdown", bus: "other" },
];
const MAX98357_R: PinSpec[] = [
  { id: "SPKP", name: "SPK+", bus: "other" },
  { id: "SPKM", name: "SPK−", bus: "other" },
];
const GC9A01: PinSpec[] = [
  { id: "VCC", name: "VCC", sub: "3-5V", bus: "power" },
  { id: "GND", name: "GND", bus: "gnd" },
  { id: "SCL", name: "SCL", sub: "SCLK", bus: "spi" },
  { id: "SDA", name: "SDA", sub: "MOSI", bus: "spi" },
  { id: "RES", name: "RES", sub: "reset", bus: "other" },
  { id: "DC", name: "DC", sub: "adat/parancs", bus: "other" },
  { id: "CS", name: "CS", bus: "spi" },
  { id: "BLK", name: "BLK", sub: "háttérvil.", bus: "other" },
];
const SPEAKER: PinSpec[] = [
  { id: "P", name: "+", bus: "other" },
  { id: "M", name: "−", bus: "gnd" },
];
/** Táp-sín (bus-bar): n azonos busz-típusú csatlakozó. */
function rail(name: string, bus: Bus, n: number): PinSpec[] {
  return Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, name, bus }));
}

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
  oneCol(
    {
      id: "bme280",
      name: "BME280",
      category: "I2C/SPI szenzor",
      color: "#1a7f9c",
      note: "Hő + pára + légnyomás. I2C cím 0x76/0x77, vagy 4-vezetékes SPI.",
    },
    BME280,
    136,
  ),
  oneCol(
    {
      id: "ssd1306",
      name: "SSD1306 OLED",
      category: "I2C kijelző",
      color: "#0b7285",
      note: "0.96\" 128×64 I2C OLED. Alap cím 0x3C. Logika 3V3/5V.",
    },
    SSD1306,
    140,
  ),
  oneCol(
    {
      id: "hcsr04",
      name: "HC-SR04",
      category: "Ultrahang",
      color: "#9a3412",
      note: "Távolságmérő. ECHO 5V-os — 3V3 MCU-nál feszültségosztó/szintillesztő kell!",
    },
    HCSR04,
    132,
  ),
  oneCol(
    {
      id: "dht22",
      name: "DHT22 / AM2302",
      category: "Hő/pára",
      color: "#2f9e44",
      note: "1-wire protokoll, 10k pull-up a DATA lábra. DHT11 kompatibilis kiosztás.",
    },
    DHT22,
    140,
  ),
  oneCol(
    {
      id: "ds18b20",
      name: "DS18B20",
      category: "1-wire hő",
      color: "#2f9e44",
      note: "1-wire hőmérő. 4,7k pull-up a DQ és VDD közé. Több szenzor egy buszon.",
    },
    DS18B20,
    148,
  ),
  twoCol(
    {
      id: "ws2812",
      name: "WS2812B (NeoPixel)",
      category: "LED szalag",
      color: "#c026d3",
      note: "Címezhető RGB LED. 5V, DIN a vezérlőtől. Ajánlott 330–470Ω soros ellenállás + 1000µF a tápra.",
    },
    WS2812,
    WS2812_R,
    168,
  ),
  twoCol(
    {
      id: "microsd",
      name: "micro SD modul",
      category: "SPI tároló",
      color: "#334155",
      note: "SPI kártyaolvasó. Legtöbb modul 5V-ról működik, 3V3 logikára szintillesztővel.",
    },
    MICROSD,
    [],
    150,
  ),
  twoCol(
    {
      id: "llc",
      name: "Szintillesztő (4 cs.)",
      category: "Logika 3V3↔5V",
      color: "#475569",
      note: "Kétirányú logikai szintillesztő. LV = alacsony oldal (3V3), HV = magas oldal (5V).",
    },
    LLC_LV,
    LLC_HV,
    168,
  ),
  twoCol(
    {
      id: "l298n",
      name: "L298N motorvezérlő",
      category: "H-híd",
      color: "#b45309",
      note: "Kétcsatornás DC-motor / léptető meghajtó. ENA/ENB PWM, IN1–4 irány. 5V jumper levehető.",
    },
    L298N,
    L298N_R,
    176,
  ),
  twoCol(
    {
      id: "relay",
      name: "Relé modul (1 cs.)",
      category: "Kapcsoló",
      color: "#7c3aed",
      note: "Opto-leválasztott relé. IN aktív-alacsony a legtöbb modulnál. COM/NO/NC a terhelés oldalán.",
    },
    RELAY,
    RELAY_R,
    170,
  ),
  oneCol(
    {
      id: "servo",
      name: "Szervó (SG90/MG996)",
      category: "Aktuátor",
      color: "#ea580c",
      note: "Hobbi szervó. V+ külön tápról (ne az MCU 3V3-ról!), SIG ~50Hz PWM, közös GND.",
    },
    SERVO,
    132,
  ),
  // --- Táp / töltés / hang / kijelző / sínek (Gyula bővítés) ---
  oneCol(
    {
      id: "lipo3s",
      name: "3S LiPo pakk",
      category: "Akku",
      color: "#b91c1c",
      note: "11.1V névleges (12.6V töltve). Fő +/− az XT60-ra, balansz a BMS-re.",
    },
    LIPO3S,
    150,
  ),
  twoCol(
    {
      id: "bms3s",
      name: "3S BMS (60A)",
      category: "Védelem",
      color: "#7f1d1d",
      note: "3S cella-védelem + balansz. B−/B1/B2/B+ a cellákra, P+/P− a védett kimenet.",
    },
    BMS_L,
    BMS_R,
    150,
  ),
  twoCol(
    {
      id: "ip2368",
      name: "IP2368 töltő",
      category: "Töltő",
      color: "#9a3412",
      note: "2–5S USB-C PD + DC (Qi dokk) töltő, 3S-re állítva. BAT a pakkra (BMS-en át).",
    },
    IP2368_L,
    IP2368_R,
    164,
  ),
  twoCol(
    {
      id: "buck6v",
      name: "Buck 6V (XH-M401)",
      category: "Táp",
      color: "#166534",
      note: "Step-down a szervó-sínre (~6V). IN a 3S fő sínről, OUT a 6V sínre. Bulk kondi kell!",
    },
    BUCK_L,
    BUCK_R,
    150,
  ),
  twoCol(
    {
      id: "buck5v",
      name: "Buck 5V (XL4015)",
      category: "Táp",
      color: "#166534",
      note: "Step-down a logikai sínre (5V). IN a 3S fő sínről, OUT a Pi/ESP 5V-ra.",
    },
    BUCK_L,
    BUCK_R,
    150,
  ),
  twoCol(
    {
      id: "max98357",
      name: "MAX98357 I2S amp",
      category: "Hang",
      color: "#7c2d12",
      note: "I2S D-osztályú erősítő. DIN = Pi I2S DOUT, BCLK/LRC közös az I2S busszal. SPK± a hangszóróra.",
    },
    MAX98357,
    MAX98357_R,
    160,
  ),
  oneCol(
    {
      id: "gc9a01",
      name: 'GC9A01 1.28" kerek LCD',
      category: "SPI kijelző",
      color: "#5b21b6",
      note: "240×240 kerek IPS, SPI. A 'szemekhez' 2 db: közös SCLK/MOSI, külön CS/DC/RST.",
    },
    GC9A01,
    168,
  ),
  oneCol(
    {
      id: "speaker",
      name: "Hangszóró (K50-8)",
      category: "Hang",
      color: "#334155",
      note: "8Ω hangszóró a MAX98357 SPK± kimenetére.",
    },
    SPEAKER,
    140,
  ),
  oneCol(
    {
      id: "fuse",
      name: "Fő-biztosíték",
      category: "Védelem",
      color: "#b45309",
      note: "Fő olvadó-biztosíték a pakk + ágán: BMS P+ → fuse → főkapcsoló → buckok. Hexapodnál ~20-30A.",
    },
    FUSE,
    120,
  ),
  oneCol(
    {
      id: "switch",
      name: "Főkapcsoló",
      category: "Kapcsoló",
      color: "#475569",
      note: "Fő be/ki a biztosíték után. IN a biztosítékról, OUT a buckok IN+-ára.",
    },
    SWITCH_PIN,
    120,
  ),
  oneCol(
    {
      id: "cap",
      name: "Bulk kondi",
      category: "Passzív",
      color: "#0f766e",
      note: "Bulk elkó a 6V szervó-sínen (2200-4700µF). + a 6V sínre, − a GND sínre; a szervó-áramlökést pufferolja.",
    },
    CAP,
    110,
  ),
  oneCol(
    {
      id: "rail6v",
      name: "6V sín",
      category: "Táp-sín",
      color: "#15803d",
      note: "Szervó-tápsín (a 6V buck kimenete). Ide köt a 2 PCA9685 V+ és a bulk kondik.",
    },
    rail("6V", "power", 10),
    96,
  ),
  oneCol(
    {
      id: "rail5v",
      name: "5V sín",
      category: "Táp-sín",
      color: "#15803d",
      note: "5V logikai sín (XL4015). Ide köt a Pi 5V és az ESP32 VIN.",
    },
    rail("5V", "power", 6),
    96,
  ),
  oneCol(
    {
      id: "rail3v3",
      name: "3V3 sín",
      category: "Táp-sín",
      color: "#15803d",
      note: "3V3 logikai sín. Szenzorok VIN/VCC.",
    },
    rail("3V3", "power", 6),
    96,
  ),
  oneCol(
    {
      id: "railgnd",
      name: "GND sín",
      category: "Táp-sín",
      color: "#334155",
      note: "Közös föld (star-GND). Minden GND ide fut.",
    },
    rail("GND", "gnd", 12),
    96,
  ),
];

/** defId → ComponentDef gyors kikeresés. */
export const COMPONENT_MAP: Record<string, ComponentDef> = Object.fromEntries(
  COMPONENTS.map((c) => [c.id, c]),
);

export function getDef(defId: string): ComponentDef | undefined {
  return COMPONENT_MAP[defId];
}
