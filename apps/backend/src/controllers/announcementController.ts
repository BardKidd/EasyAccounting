import { Request, Response } from 'express';
import Announcement from '../models/announcement';
import { simplifyTryCatch } from '../utils/common';

const createAnnouncement = async (req: Request, res: Response) => {
  await simplifyTryCatch(req, res, async () => {
    const { title, content, type, expiresAt } = req.body;

    const announcement = await Announcement.create({
      title,
      content,
      type,
      expiresAt, // 如果有傳這個，時間到 MongoDB 會自動刪除
    });

    res.status(201).json(announcement);
  });
};

const getAnnouncements = async (req: Request, res: Response) => {
  await simplifyTryCatch(req, res, async () => {
    const announcements = await Announcement.find({ isActive: true }).sort({
      createdAt: -1,
    }); // 按時間倒序

    res.status(200).json(announcements);
  });
};

const updateAnnouncement = async (req: Request, res: Response) => {
  await simplifyTryCatch(req, res, async () => {
    const { id } = req.params;
    const { title, content, type, expiresAt } = req.body;

    const result = await Announcement.findByIdAndUpdate(id, {
      title,
      content,
      type,
      expiresAt,
    });

    if (result) {
      res.status(200).json(result);
    } else {
      res.status(404).json({ message: 'Announcement not found' });
    }
  });
};

const deleteAnnouncement = async (req: Request, res: Response) => {
  await simplifyTryCatch(req, res, async () => {
    const { id } = req.params;

    const result = await Announcement.findByIdAndDelete(id);

    if (result) {
      res.status(200).json(result);
    } else {
      res.status(404).json({ message: 'Announcement not found' });
    }
  });
};

export default {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
};
