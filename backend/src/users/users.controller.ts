import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { UserQueryDto } from './dto/user-query.dto';
import {
  CreateUserResponseDto,
  UserResponseDto,
} from './dto/user-response.dto';
import { RoleName } from './entities/role.entity';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users')
@UseGuards(RolesGuard)
@Roles(RoleName.ADMIN)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List users, paginated, filterable by role/active (ADMIN)',
  })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  async findAll(@Query() query: UserQueryDto) {
    const result = await this.usersService.findAllPaginated(query);
    return {
      data: result.data.map((user) => UserResponseDto.fromEntity(user)),
      meta: result.meta,
    };
  }

  @Post()
  @ApiOperation({
    summary:
      'Create a user with email, name and roles; returns a generated ' +
      'temporary password once (ADMIN)',
  })
  @ApiOkResponse({ type: CreateUserResponseDto })
  async create(@Body() dto: CreateUserDto, @CurrentUser() actor: RequestUser) {
    const { user, temporaryPassword } = await this.usersService.createUser(
      dto,
      actor,
    );
    return CreateUserResponseDto.fromUserAndPassword(user, temporaryPassword);
  }

  @Patch(':id')
  @ApiOperation({
    summary: "Update a user's name and/or active state (ADMIN)",
    description:
      'Deactivating revokes all of the user\u2019s refresh tokens. ' +
      'Deactivating the last active ADMIN returns 409.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: RequestUser,
  ) {
    const { user, justDeactivated } = await this.usersService.updateProfile(
      id,
      dto,
      actor,
    );
    if (justDeactivated) {
      await this.authService.revokeAllForUser(user.id);
    }
    return UserResponseDto.fromEntity(user);
  }

  @Put(':id/roles')
  @ApiOperation({
    summary: "Replace a user's role set (ADMIN)",
    description: 'Removing ADMIN from the last active ADMIN returns 409.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  async updateRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRolesDto,
    @CurrentUser() actor: RequestUser,
  ) {
    const user = await this.usersService.updateRoles(id, dto, actor);
    return UserResponseDto.fromEntity(user);
  }
}
