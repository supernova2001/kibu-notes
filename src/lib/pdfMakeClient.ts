// src/lib/pdfmakeClient.ts

// @ts-ignore – pdfmake doesn't ship proper types for build files
import pdfMake from "pdfmake/build/pdfmake";
// @ts-ignore
import pdfFonts from "pdfmake/build/vfs_fonts";

// Bind fonts to pdfMake
// @ts-ignore
pdfMake.vfs = pdfFonts.vfs;

export default pdfMake;