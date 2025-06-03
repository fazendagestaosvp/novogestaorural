"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var supabase_js_1 = require("@supabase/supabase-js");
var dotenv_1 = require("dotenv");
// Carrega as variáveis de ambiente do arquivo .env
dotenv_1.default.config();
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
}
var supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
function setupStorage() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, buckets, listBucketsError, bucketName_1, bucketExists, createBucketError, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 5, , 6]);
                    console.log('Verificando e configurando o bucket de fotos...');
                    return [4 /*yield*/, supabase.storage.listBuckets()];
                case 1:
                    _a = _b.sent(), buckets = _a.data, listBucketsError = _a.error;
                    if (listBucketsError) {
                        console.error('Erro ao listar buckets:', listBucketsError);
                        return [2 /*return*/];
                    }
                    bucketName_1 = 'horse-photos';
                    bucketExists = buckets.some(function (bucket) { return bucket.name === bucketName_1; });
                    if (!!bucketExists) return [3 /*break*/, 3];
                    console.log("Criando bucket ".concat(bucketName_1, "..."));
                    return [4 /*yield*/, supabase.storage.createBucket(bucketName_1, {
                            public: true,
                            allowedMimeTypes: ['image/*'],
                            fileSizeLimit: 1024 * 1024 * 5, // 5MB
                        })];
                case 2:
                    createBucketError = (_b.sent()).error;
                    if (createBucketError) {
                        console.error('Erro ao criar bucket:', createBucketError);
                        return [2 /*return*/];
                    }
                    console.log("Bucket ".concat(bucketName_1, " criado com sucesso!"));
                    return [3 /*break*/, 4];
                case 3:
                    console.log("Bucket ".concat(bucketName_1, " j\u00E1 existe."));
                    _b.label = 4;
                case 4:
                    console.log('Configuração de armazenamento concluída!');
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _b.sent();
                    console.error('Erro ao configurar o armazenamento:', error_1);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
setupStorage();
