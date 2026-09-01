import prisma from "../config/prisma";
import { CreateRatingDto } from "../dto/rating.dto";

class RatingService {
  async createRating(parentId: string, dto: CreateRatingDto) {
    await prisma.ratings.deleteMany({
        where: {
            parent_id: parentId,
        }
    });
    const rating = await prisma.ratings.create({
      data: {
        parent_id: parentId,
        rating: dto.rating,
        comment: dto.comment || null,
      },
      include: {
        parents: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    return {
      id: rating.id,
      parent_id: rating.parent_id,
      rating: rating.rating,
      comment: rating.comment,
      created_at: rating.created_at,
      updated_at: rating.updated_at,
      parent: rating.parents,
    };
  }

  async getRatings(parentId?: string) {
    const where = parentId ? { parent_id: parentId } : {};

    const ratings = await prisma.ratings.findMany({
      where,
      include: {
        parents: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return ratings.map((rating:any) => ({
      id: rating.id,
      parent_id: rating.parent_id,
      rating: rating.rating,
      comment: rating.comment,
      created_at: rating.created_at,
      updated_at: rating.updated_at,
      parent: rating.parents,
    }));
  }

  async getRatingById(ratingId: string) {
    const rating = await prisma.ratings.findUnique({
      where: { id: ratingId },
      include: {
        parents: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    if (!rating) {
      throw new Error("Rating not found");
    }

    return {
      id: rating.id,
      parent_id: rating.parent_id,
      rating: rating.rating,
      comment: rating.comment,
      created_at: rating.created_at,
      updated_at: rating.updated_at,
      parent: rating.parents,
    };
  }

  async getRatingStats() {
    const totalRatings = await prisma.ratings.count();
    const averageRating = await prisma.ratings.aggregate({
      _avg: {
        rating: true,
      },
    });

    const ratingDistribution = await prisma.ratings.groupBy({
      by: ["rating"],
      _count: {
        rating: true,
      },
    });

    return {
      total_ratings: totalRatings,
      average_rating: averageRating._avg.rating
        ? Number(averageRating._avg.rating.toFixed(2))
        : 0,
      rating_distribution: ratingDistribution.map((r:any) => ({
        rating: r.rating,
        count: r._count.rating,
      })),
    };
  }
}

export default new RatingService();

