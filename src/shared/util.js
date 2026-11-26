'use strict';

const $ = id => document.getElementById(id);
const num = (v, lo, hi, d) => Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
