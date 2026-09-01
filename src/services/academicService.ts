import prisma from "../config/prisma";
import { CreateAcademicDto, UpdateAcademicDto } from "../dto/academic.dto";
import { v4 as uuidv4 } from "uuid";


class AcademicService {
    async getAllAcademicYears() {
        return prisma.academic_years.findMany({
            orderBy: { grade: "asc" },
        });
    }

    async getAcademicYearById(id: string) {
        const academicYear = await prisma.academic_years.findUnique({
            where: { id },
        });

        if (!academicYear) throw new Error("Academic year not found");
        return academicYear;
    }

    async createAcademicYear(academicData: CreateAcademicDto) {
        return prisma.academic_years.create({
            data: {
                id: uuidv4(),
                name: academicData.name,
                grade: academicData.grade,
                description: academicData.description ?? null,
            },
        });
    }

    async updateAcademicYear(id: string, academicData: UpdateAcademicDto) {
        const data: Record<string, any> = {};
        if (academicData.name) data.name = academicData.name;
        if (academicData.grade !== undefined) data.grade = academicData.grade;
        if (academicData.description !== undefined) data.description = academicData.description;

        try {
            return await prisma.academic_years.update({
                where: { id },
                data,
            });
        } catch (err: any) {
            if (err.code === "P2025") {
                throw new Error("Academic year not found");
            }
            throw err;
        }
    }

    async deleteAcademicYear(id: string) {
        try {
            return await prisma.academic_years.delete({
                where: { id },
            });
        } catch (err: any) {
            if (err.code === "P2025") {
                throw new Error("Academic year not found");
            }
            throw err;
        }
    }
}


export const academicService = new AcademicService();
