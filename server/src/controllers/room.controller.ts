import User from "../models/user.model";
import Room from "../models/room.model";
import { getUniqueRoomCode } from "../utils/generate.room.code";
import { setActiveRoomStatus } from "../utils/set.user.active.room";


/**
 * @desc    Create a Room
 * @route   POST /api/rooms
 * @access  PRIVATE
 */

export const createRoom = async (req, res) => {
    const { roomName, roomDescription } = req.body;

    try {

        if(!roomName || !roomDescription) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: room name/description missing",
                message: "Both a room name and description are required."
            })
        }

        // check if user has active room already
        const user = await User.findById(req.user._id)

        if(user && user.hasActiveRoom) {
            console.error("There was an error creating a room:", `Cannot create room for ${user.username}, as they already have an active room!`);

            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: user has active room",
                message: "You must all end all active rooms before creating a new one."
            })
        }

        // generate room code to use during room creation
        const roomCode = await getUniqueRoomCode();

        // create the room
        const newRoom = await Room.create({
            roomName,
            roomDescription,
            roomCode,
            roomCreator: user._id,
            active: true
        })

        if(!newRoom) {
            console.error("There was an error with MongoDB creating a room:", )
            return res.status(500).json({
                success: false,
                error: "Internal Server Error -Failed to create room",
                message: "Failed to create room, please try again."
            })
        }

        //  generate room QR code
        await Room.generateRoomQr(newRoom._id);


        // update the user's hasActiveRoom status
        try {
            await setActiveRoomStatus(req.user._id, true);
        } catch (err) {
           console.error("User hasActiveRoom update failed:", err);
        //    delete the room we just created and throw error
        await Room.findByIdAndDelete(newRoom._id);

        return res.status(500).json({
            success: false,
            error: "Internal Server Error: trouble changing active room status",
            message: "We're having trouble creating your room, please try again soon."
        });
        };

        return res.status(201).json({
            success: true,
            message: `Success! ${newRoom.roomName} has been created and is now active.`,
            newRoom
        })

    } catch (err) {
       console.error("There was an error attempting to create a room:", err);
       return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "We're having trouble creating the room, please try again soon."
       })
    }
}



/**
 * @desc    Delete a room
 * @route   DELETE /api/rooms/:roomId
 * @access  PRIVATE
 * @feats   Deletes a room from existence and as a safety, set's a user's hasActiveRoom prop to false.
 */

export const deleteRoom = async (req, res) => {
    try {

        // get room ID from URL params
        const { roomId } = req.params;

        // get user ID from request body
        // const { userId }  = req.body;
        const { userId } = req.body;

        if(!roomId) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: room ID is required",
                message: "Oops! We're having trouble, try again."
            })
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: user ID is required",
                message: "Oops! We're having trouble, try again.",
            });
        }


        const room = await Room.findById(roomId);

        if(!room) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Room not found."
            })
        }

        // check if user is authorized (is the roomCreator)
        const roomCreator = room.roomCreator;

        if(roomCreator.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                error: "Forbidden: not authorized",
                message: "Not Authorized! You are not the creator of this room."
            })
        }

        // delete room
        await Room.findByIdAndDelete(room._id);


        // TODO === uncomment this ==== \\
        // delete the requests that were created in the room
        // await Request.deleteMany({ roomId: room._id });


        // double check the user's hasActiveRoom prop is false
        const user = await User.findById(userId);

        if(!user) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "User not found."
            })
        }

        user.hasActiveRoom = false
        await user.save();

        // return success response
        return res.status(200).json({
            success: true,
            message: `The ${room.roomName} room has been successfully deleted.`,
            room
        })


    } catch (err) {
       console.error("There was an error attempting to delete a room:", err);
       return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "We're currently having trouble deleting this room, please try again soon."
       })
    }
}


/**
 * @desc    Fetch Room Details
 * @route   GET /api/rooms/:roomCode
 * @access  PUBLIC
 * @feats   Finds and returns a room's details based on roomCode
 */

export const fetchRoomDetails = async (req, res) => {
    const { roomCode } = req.params;

    try {

        const room = await Room.findOne({ roomCode });

        if(!room) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Room not found!"
            })
        } else {
            const roomDetails = {
                _id: room._id,
                roomName: room.roomName,
                roomDescription: room.roomDescription,
                roomCode: room.roomCode,
                roomQr: room.roomQr,
                createdAt: room.createdAt,
                updatedAt: room.updatedAt,
                active: room.active,
            };

            return res.status(200).json({
                success: true,
                message: `Success! Here's ${room.roomName}'s details.`,
                roomDetails
            })
        }

    } catch (err) {
       console.error("There was an error fetching a room's details:", err);
       return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "We're having trouble, please try again."
       })
    }
}