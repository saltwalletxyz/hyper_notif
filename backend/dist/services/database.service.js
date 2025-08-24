"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseService = exports.db = void 0;
const client_1 = require("@prisma/client");
class DatabaseService {
    prisma;
    static instance;
    constructor() {
        this.prisma = new client_1.PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        });
    }
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }
    get client() {
        return this.prisma;
    }
    async connect() {
        try {
            await this.prisma.$connect();
            console.log('Database connected successfully');
        }
        catch (error) {
            console.error('Database connection failed:', error);
            throw error;
        }
    }
    async disconnect() {
        await this.prisma.$disconnect();
        console.log('Database disconnected');
    }
    async healthCheck() {
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
exports.db = DatabaseService.getInstance().client;
exports.databaseService = DatabaseService.getInstance();
